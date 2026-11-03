import { fireEvent, render, screen, userEvent } from '@soundor/testing-library/react';
import { useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';

import { RESTING_INTERACTION } from '../shared/interaction.ts';
import type { InteractionState, InteractionStore } from '../shared/interaction.ts';
import type { InteractionOptions } from '../shared/services.ts';
import { useInteractionField } from '../shared/use-interaction-field.ts';
import { mergeProps } from './merge-props.ts';
import { Primitive } from './primitive.ts';
import type { PrimitiveProps } from './types.ts';
import { useInteraction } from './use-interaction.ts';

interface ProbeProps extends InteractionOptions {
  /** Called with the state of the store on every render of the probe. */
  readonly onRender: (state: InteractionState) => void;
}

const CONTROL: PrimitiveProps<'svg'> = { role: 'slider', tabIndex: 0, 'aria-label': 'Probe' };

/** A control that tracks its interaction, another one, and some text to move the pointer to. */
function Probe({ onRender, ...options }: ProbeProps): ReactElement {
  const { store, props } = useInteraction(options);
  onRender(useSyncExternalStore(store.subscribe, store.getState));
  return (
    <>
      <Primitive.svg {...mergeProps(props, CONTROL)} />
      <Primitive.button>Other</Primitive.button>
      <Primitive.text>Elsewhere</Primitive.text>
    </>
  );
}

/** The state of the probe, at rest but for the flags given. */
const state = (flags: Partial<InteractionState>): InteractionState => ({
  ...RESTING_INTERACTION,
  ...flags,
});

async function setup(options: InteractionOptions = {}) {
  const renders: InteractionState[] = [];
  const onRender = (next: InteractionState): void => {
    renders.push(next);
  };
  const view = (next: InteractionOptions): ReactElement => <Probe {...next} onRender={onRender} />;
  const user = userEvent.setup();
  const { rerender } = await render(view(options));
  return {
    user,
    control: screen.getByRole('adjustable', { name: 'Probe' }),
    elsewhere: screen.getByText('Elsewhere'),
    /** The state the probe rendered last. */
    last: () => renders.at(-1),
    rerender: (next: InteractionOptions) => rerender(view(next)),
  };
}

type Field = 'hovered' | 'focused';

interface FieldReaderProps {
  readonly store: InteractionStore;
  readonly field: Field;
  readonly onRender: (field: Field) => void;
}

/** Reads one field of the store, and says when it renders. */
function FieldReader({ store, field, onRender }: FieldReaderProps): null {
  useInteractionField(store, field);
  onRender(field);
  return null;
}

/** A control and two readers of its state, one field each. */
function Reader({ onRender }: { readonly onRender: (field: Field) => void }): ReactElement {
  const { store, props } = useInteraction();
  return (
    <>
      <Primitive.svg {...mergeProps(props, CONTROL)} />
      <FieldReader store={store} field="hovered" onRender={onRender} />
      <FieldReader store={store} field="focused" onRender={onRender} />
    </>
  );
}

describe('useInteraction on Soundor', () => {
  it('is hovered while a mouse is over the control, and pressed while it is held down', async () => {
    const { user, control, elsewhere, last } = await setup();
    await user.pointer({ target: control });
    expect(last()).toEqual(state({ hovered: true }));
    await user.pointer({ target: control, keys: '[MouseLeft>]' });
    expect(last()).toEqual(state({ hovered: true, pressed: true, focused: true }));
    await user.pointer({ target: control, keys: '[/MouseLeft]' });
    expect(last()).toEqual(state({ hovered: true, focused: true }));
    await user.pointer({ target: elsewhere });
    expect(last()).toEqual(state({ focused: true }));
  });

  it('keeps the press with the pointer, wherever it goes until the release', async () => {
    const { user, control, elsewhere, last } = await setup();
    await user.pointer({ target: control, keys: '[MouseLeft>]' });
    await user.pointer({ target: elsewhere });
    // Soundor keeps the pointer with the press: still over the control, as Pressable says.
    expect(last()).toEqual(state({ hovered: true, pressed: true, focused: true }));
    await user.pointer({ target: elsewhere, keys: '[/MouseLeft]' });
    expect(last()).toEqual(state({ focused: true }));
  });

  it('is pressed by the primary button only', async () => {
    const { control, last } = await setup();
    fireEvent.pointerDown(control, { button: 2 });
    expect(last()?.pressed).toBe(false);
    fireEvent.pointerUp(control, { button: 2 });
  });

  it('is never hovered by a touch', async () => {
    const { control, last } = await setup();
    fireEvent(control, 'pointerenter', { pointerType: 'touch' });
    expect(last()?.hovered).toBe(false);
    fireEvent(control, 'pointerenter', { pointerType: 'pen' });
    expect(last()?.hovered).toBe(true);
  });

  it('shows the focus Tab gives, not the focus of a press until a key is pressed', async () => {
    const { user, control, last } = await setup();
    await user.tab();
    expect(last()).toEqual(state({ focused: true, focusVisible: true }));
    await user.tab();
    expect(last()).toEqual(state({}));
    await user.click(control);
    expect(last()).toEqual(state({ hovered: true, focused: true }));
    await user.keyboard('{ArrowUp}');
    expect(last()).toEqual(state({ hovered: true, focused: true, focusVisible: true }));
  });

  it('tells every change of the focus to onFocusChange', async () => {
    const onFocusChange = vi.fn<(focused: boolean, focusVisible: boolean) => void>();
    const { user, control } = await setup({ onFocusChange });
    await user.tab();
    await user.tab();
    await user.click(control);
    await user.keyboard('{ArrowUp}');
    expect(onFocusChange.mock.calls).toEqual([
      [true, true],
      [false, false],
      [true, false],
      [true, true],
    ]);
  });

  it('tells onFocusChange the focus as the state shows it: none while disabled', async () => {
    const onFocusChange = vi.fn<(focused: boolean, focusVisible: boolean) => void>();
    const { user, rerender } = await setup({ onFocusChange });
    await user.tab();
    // The control keeps its tabIndex here, and with it the focus.
    await rerender({ onFocusChange, disabled: true });
    await rerender({ onFocusChange });
    expect(onFocusChange.mock.calls).toEqual([
      [true, true],
      [false, false],
      [true, true],
    ]);
  });

  it('rests while disabled, from the render that turns it on, and starts no press', async () => {
    const { user, control, last, rerender } = await setup();
    await user.tab();
    await user.pointer({ target: control });
    expect(last()).toEqual(state({ hovered: true, focused: true, focusVisible: true }));
    await rerender({ disabled: true });
    expect(last()).toEqual(RESTING_INTERACTION);
    fireEvent.pointerDown(control);
    expect(last()).toEqual(RESTING_INTERACTION);
    fireEvent.pointerUp(control);
    // Hover and focus are still followed: enabled again, the control shows its real state.
    await rerender({ disabled: false });
    expect(last()).toEqual(state({ hovered: true, focused: true, focusVisible: true }));
  });

  it('ends a press as the control turns disabled', async () => {
    const { user, control, last, rerender } = await setup();
    await user.pointer({ target: control, keys: '[MouseLeft>]' });
    await rerender({ disabled: true });
    await rerender({ disabled: false });
    expect(last()?.pressed).toBe(false);
    await user.pointer({ target: control, keys: '[/MouseLeft]' });
  });

  it('counts no hover while not hoverable', async () => {
    const { user, control, last, rerender } = await setup({ hoverable: false });
    await user.pointer({ target: control });
    expect(last()?.hovered).toBe(false);
    await rerender({ hoverable: true });
    expect(last()?.hovered).toBe(true);
  });

  it('renders only who reads a field again when it changes', async () => {
    const onRender = vi.fn<(field: Field) => void>();
    const user = userEvent.setup();
    await render(<Reader onRender={onRender} />);
    onRender.mockClear();
    await user.pointer({ target: screen.getByRole('adjustable', { name: 'Probe' }) });
    expect(onRender.mock.calls).toEqual([['hovered']]);
  });
});
