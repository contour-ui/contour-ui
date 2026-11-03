import type { PressableState } from '@soundor/react';
import { render, screen, userEvent } from '@soundor/testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';

import { RESTING_INTERACTION } from '../shared/interaction.ts';
import type { InteractionState } from '../shared/interaction.ts';
import { mergeProps } from './merge-props.ts';
import { Primitive } from './primitive.ts';
import type { StyleStateProps } from './types.ts';
import { useStyleState } from './use-style-state.ts';

/** Both states of the probe, as one render of its Pressable sees them. */
interface Copies {
  /** The hook's copy, as the component that renders the button has it. */
  readonly hook: InteractionState;
  /** Pressable's own state, as it gives it to its `style` function. */
  readonly pressable: PressableState;
}

interface ProbeProps extends Partial<StyleStateProps> {
  readonly disabled?: boolean;
  readonly onRender?: (copies: Copies) => void;
}

/** A button under the hook, with another control and some text to move to. */
function Probe({ disabled = false, onRender, ...handlers }: ProbeProps): ReactElement {
  const { state, props } = useStyleState({ disabled });
  return (
    <>
      <Primitive.button
        disabled={disabled}
        {...mergeProps(props, handlers)}
        style={(own) => {
          onRender?.({ hook: state, pressable: own });
          return null;
        }}
      >
        Probe
      </Primitive.button>
      <Primitive.button>Other</Primitive.button>
      <Primitive.text>Elsewhere</Primitive.text>
    </>
  );
}

/** The hook and Pressable in the same state: at rest, but for the flags given. */
function both(flags: Partial<InteractionState>): Copies {
  const state = { ...RESTING_INTERACTION, ...flags };
  return { hook: state, pressable: state };
}

async function setup() {
  const renders: Copies[] = [];
  const onRender = (copies: Copies): void => {
    renders.push(copies);
  };
  const user = userEvent.setup();
  const { rerender } = await render(<Probe onRender={onRender} />);
  return {
    user,
    probe: screen.getByRole('button', { name: 'Probe' }),
    elsewhere: screen.getByText('Elsewhere'),
    setDisabled: (disabled: boolean) => rerender(<Probe disabled={disabled} onRender={onRender} />),
    /** Both states after the last step. */
    states: () => renders.at(-1),
  };
}

describe('useStyleState on Soundor', () => {
  it('follows Pressable through a hover, a press and focus moves', async () => {
    const { user, probe, elsewhere, states } = await setup();
    await user.pointer({ target: probe });
    expect(states()).toEqual(both({ hovered: true }));
    await user.pointer({ target: probe, keys: '[MouseLeft>]' });
    expect(states()).toEqual(both({ pressed: true, hovered: true, focused: true }));
    await user.pointer({ target: probe, keys: '[/MouseLeft]' });
    expect(states()).toEqual(both({ hovered: true, focused: true }));
    await user.pointer({ target: elsewhere });
    expect(states()).toEqual(both({ focused: true }));
    await user.tab();
    expect(states()).toEqual(both({}));
    await user.tab({ shift: true });
    expect(states()).toEqual(both({ focused: true, focusVisible: true }));
  });

  it('follows Pressable when a held press moves away', async () => {
    const { user, probe, elsewhere, states } = await setup();
    await user.pointer({ target: probe, keys: '[MouseLeft>]' });
    // The held press keeps the pointer: pressed and hovered until it is released.
    await user.pointer({ target: elsewhere });
    expect(states()).toEqual(both({ pressed: true, hovered: true, focused: true }));
    await user.pointer({ target: elsewhere, keys: '[/MouseLeft]' });
    expect(states()).toEqual(both({ focused: true }));
    await user.pointer({ target: probe });
    expect(states()).toEqual(both({ hovered: true, focused: true }));
  });

  it('shows the focus a key gives, and the focus a press gave once a key is pressed', async () => {
    const { user, probe, states } = await setup();
    await user.tab();
    expect(states()).toEqual(both({ focused: true, focusVisible: true }));
    await user.tab();
    await user.click(probe);
    expect(states()).toEqual(both({ hovered: true, focused: true }));
    // A modifier on its own is not a move through the controls.
    await user.keyboard('{Shift}');
    expect(states()).toEqual(both({ hovered: true, focused: true }));
    await user.keyboard('{ArrowDown}');
    expect(states()).toEqual(both({ hovered: true, focused: true, focusVisible: true }));
  });

  it('keeps showing the focus when the control it shows on is pressed', async () => {
    const { user, probe, states } = await setup();
    await user.tab();
    // The press gives no focus: the control has it, and shows it, as `:focus-visible` does.
    await user.click(probe);
    expect(states()).toEqual(both({ hovered: true, focused: true, focusVisible: true }));
  });

  it('rests while disabled, as Pressable, which drops its state without calling a handler', async () => {
    const { user, probe, elsewhere, setDisabled, states } = await setup();
    await user.tab();
    await user.pointer({ target: probe });
    expect(states()).toEqual(both({ hovered: true, focused: true, focusVisible: true }));
    await setDisabled(true);
    expect(states()).toEqual(both({}));
    await setDisabled(false);
    expect(states()).toEqual(both({}));
    await user.pointer({ target: elsewhere });
    expect(states()).toEqual(both({}));
  });

  it('rests when turned off in the middle of a press', async () => {
    const { user, probe, elsewhere, setDisabled, states } = await setup();
    await user.pointer({ target: probe, keys: '[MouseLeft>]' });
    expect(states()).toEqual(both({ pressed: true, hovered: true, focused: true }));
    await setDisabled(true);
    expect(states()).toEqual(both({}));
    await user.pointer({ target: elsewhere, keys: '[/MouseLeft]' });
    await setDisabled(false);
    expect(states()).toEqual(both({}));
  });

  it('leaves the handlers of the owner to mergeProps, which still calls them', async () => {
    const handlers = {
      onHoverIn: vi.fn<() => void>(),
      onHoverOut: vi.fn<() => void>(),
      onPressIn: vi.fn<() => void>(),
      onPressOut: vi.fn<() => void>(),
      onFocus: vi.fn<() => void>(),
      onBlur: vi.fn<() => void>(),
      onFocusVisibleChange: vi.fn<() => void>(),
    };
    const user = userEvent.setup();
    await render(<Probe {...handlers} />);
    const probe = screen.getByRole('button', { name: 'Probe' });
    await user.pointer({ target: probe });
    await user.pointer({ target: probe, keys: '[MouseLeft]' });
    await user.pointer({ target: screen.getByText('Elsewhere') });
    // Tab shows the focus the press gave, then takes it to the other control.
    await user.tab();
    const { onFocusVisibleChange, ...once } = handlers;
    for (const handler of Object.values(once)) {
      expect(handler).toHaveBeenCalledOnce();
    }
    expect(onFocusVisibleChange).toHaveBeenCalledTimes(2);
  });
});
