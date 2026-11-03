import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { render, renderHook } from 'vitest-browser-react';

import { RESTING_INTERACTION } from '../shared/interaction.ts';
import type { InteractionState, InteractionStore } from '../shared/interaction.ts';
import type { InteractionOptions } from '../shared/services.ts';
import { useInteractionField } from '../shared/use-interaction-field.ts';
import { mergeProps } from './merge-props.ts';
import { Primitive } from './primitive.ts';
import { useInteraction } from './use-interaction.ts';

const focusSpy = () => vi.fn<(focused: boolean, focusVisible: boolean) => void>();

type Field = keyof InteractionState;

const FIELDS: readonly Field[] = ['hovered', 'pressed', 'focused', 'focusVisible'];

const FOCUS_FIELDS: readonly Field[] = ['focused', 'focusVisible'];

/** The attribute that shows a field: `data-hovered`, `data-focusvisible`… */
const attributeOf = (field: Field): string => `data-${field.toLowerCase()}`;

/** The fields of the state, as attributes while `true`, each followed on its own. */
function useStateAttributes(store: InteractionStore): Record<string, ''> {
  const values: Record<Field, boolean> = {
    hovered: useInteractionField(store, 'hovered'),
    pressed: useInteractionField(store, 'pressed'),
    focused: useInteractionField(store, 'focused'),
    focusVisible: useInteractionField(store, 'focusVisible'),
  };
  return Object.fromEntries(
    FIELDS.filter((field) => values[field]).map((field) => [attributeOf(field), ''] as const),
  );
}

interface ControlProps extends InteractionOptions {
  /** Hears the fields that are `true` as each render reads them. */
  readonly onRender?: (fields: Field[]) => void;
}

/** What makes the control a slider, in a spread as a part writes it. */
const SLIDER = {
  role: 'slider',
  'aria-label': 'Control',
  'aria-valuenow': 0,
  tabIndex: 0,
} as const;

/** A focusable control that shows its interaction state as `data-*` attributes. */
function Control({ onRender, ...options }: ControlProps): ReactElement {
  const interaction = useInteraction(options);
  const attributes = useStateAttributes(interaction.store);
  const state = interaction.store.getState();
  onRender?.(FIELDS.filter((field) => state[field]));
  return (
    <Primitive.div
      {...mergeProps(interaction.props, attributes, SLIDER, {
        style: { width: 40, height: 40, padding: 8 },
      })}
    >
      <Primitive.button>Inside</Primitive.button>
    </Primitive.div>
  );
}

interface DialProps {
  readonly disabled?: boolean;
  readonly onFocusChange: (focused: boolean, focusVisible: boolean) => void;
}

/** A dial that drops its `tabindex` while disabled, as a disabled control does. */
function Dial({ disabled = false, onFocusChange }: DialProps): ReactElement {
  const interaction = useInteraction({ disabled, onFocusChange });
  const attributes = useStateAttributes(interaction.store);
  return (
    <Primitive.svg
      {...mergeProps(interaction.props, attributes, {
        role: 'slider',
        'aria-label': 'Control',
        'aria-valuenow': 0,
        tabIndex: disabled ? undefined : 0,
        width: 40,
        height: 40,
      })}
    />
  );
}

const control = () => page.getByRole('slider', { name: 'Control' });

/** The fields of the control's state that are `true`, read from its attributes. */
function stateOf(fields: readonly Field[] = FIELDS): Field[] {
  const element = control().element();
  return fields.filter((field) => element.hasAttribute(attributeOf(field)));
}

/** The fields of the focus that are `true`, whatever the real pointer hovers. */
const focusOf = (): Field[] => stateOf(FOCUS_FIELDS);

/** A pointer event on `target`, as the browser sends it: a mouse unless `init` says otherwise. */
function send(target: EventTarget, type: string, init: PointerEventInit = {}): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      ...init,
    }),
  );
}

/** The pointer came over the element from outside (React reads `pointerover`). */
function enter(element: Element, init: PointerEventInit = {}): void {
  send(element, 'pointerover', { relatedTarget: document.body, ...init });
}

/** The pointer left the element for the outside (React reads `pointerout`). */
function leave(element: Element, init: PointerEventInit = {}): void {
  send(element, 'pointerout', { relatedTarget: document.body, ...init });
}

// The real mouse stays where the tests before left it, and Chrome hovers what renders under it.
beforeEach(async () => {
  await userEvent.unhover(page.elementLocator(document.body));
});

describe('useInteraction', () => {
  it('follows the hover of a mouse', async () => {
    await render(<Control />);

    await userEvent.hover(control());
    await expect.poll(() => stateOf()).toStrictEqual(['hovered']);
    await userEvent.unhover(control());
    await expect.poll(() => stateOf()).toStrictEqual([]);
  });

  it('takes a pen as hovering and a touch as not', async () => {
    await render(<Control />);
    const element = control().element();

    enter(element, { pointerType: 'touch', pointerId: 2 });
    await expect.poll(() => stateOf()).toStrictEqual([]);
    leave(element, { pointerType: 'touch', pointerId: 2 });

    enter(element, { pointerType: 'pen', pointerId: 3 });
    await expect.poll(() => stateOf()).toStrictEqual(['hovered']);
    leave(element, { pointerType: 'pen', pointerId: 3 });
    await expect.poll(() => stateOf()).toStrictEqual([]);
  });

  it('shows no hover while not hoverable, and the hover as it turns hoverable', async () => {
    const screen = await render(<Control hoverable={false} />);
    const element = control().element();

    enter(element);
    await expect.poll(() => stateOf()).toStrictEqual([]);
    await screen.rerender(<Control />);
    await expect.poll(() => stateOf()).toStrictEqual(['hovered']);
    leave(element);
  });

  it('is pressed while the pointer is over it, until the release anywhere', async () => {
    await render(<Control />);
    const element = control().element();

    enter(element);
    send(element, 'pointerdown');
    await expect.poll(() => stateOf()).toStrictEqual(['hovered', 'pressed']);
    // It leaves with the pointer and comes back with it.
    leave(element);
    await expect.poll(() => stateOf()).toStrictEqual([]);
    enter(element);
    await expect.poll(() => stateOf()).toStrictEqual(['hovered', 'pressed']);
    leave(element);
    // Released outside, where a handler stops the event.
    document.body.addEventListener(
      'pointerup',
      (event) => {
        event.stopPropagation();
      },
      { once: true },
    );
    send(document.body, 'pointerup');
    enter(element);

    await expect.poll(() => stateOf()).toStrictEqual(['hovered']);
    leave(element);
  });

  it('takes only the primary button as a press, and ends it at a cancel', async () => {
    await render(<Control />);
    const element = control().element();

    send(element, 'pointerdown', { button: 2 });
    await expect.poll(() => stateOf()).toStrictEqual([]);
    send(element, 'pointerdown', { pointerType: 'touch', pointerId: 4 });
    await expect.poll(() => stateOf()).toStrictEqual(['pressed']);
    send(element, 'pointercancel', { pointerType: 'touch', pointerId: 4 });
    await expect.poll(() => stateOf()).toStrictEqual([]);
  });

  it('shows no focus ring after a click, and shows it after a key', async () => {
    const onFocusChange = focusSpy();
    await render(<Control onFocusChange={onFocusChange} />);

    await userEvent.click(control(), { position: { x: 4, y: 4 } });
    await expect.poll(focusOf).toStrictEqual(['focused']);
    // A modifier alone and a shortcut show nothing: Shift goes down for a fine drag.
    await userEvent.keyboard('{Shift>}{/Shift}');
    await userEvent.keyboard('{Control>}{ArrowUp}{/Control}');
    expect(focusOf()).toStrictEqual(['focused']);
    await userEvent.keyboard('{ArrowUp}');
    await expect.poll(focusOf).toStrictEqual(['focused', 'focusVisible']);

    expect(onFocusChange.mock.calls).toStrictEqual([
      [true, false],
      [true, true],
    ]);
  });

  it('shows the focus ring of a focus from the keyboard', async () => {
    const onFocusChange = focusSpy();
    await render(
      <>
        <button type="button">Before</button>
        <Control onFocusChange={onFocusChange} />
      </>,
    );
    page.getByRole('button', { name: 'Before' }).element().focus();

    await userEvent.keyboard('{Tab}');
    await expect.poll(focusOf).toStrictEqual(['focused', 'focusVisible']);
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expect.poll(focusOf).toStrictEqual([]);

    expect(onFocusChange.mock.calls).toStrictEqual([
      [true, true],
      [false, false],
    ]);
  });

  it('follows the focus of the element itself, not of an element inside it', async () => {
    const onFocusChange = focusSpy();
    await render(<Control onFocusChange={onFocusChange} />);

    page.getByRole('button', { name: 'Inside' }).element().focus();
    await userEvent.keyboard('{ArrowUp}');

    expect(focusOf()).toStrictEqual([]);
    expect(onFocusChange).not.toHaveBeenCalled();
  });

  it('rests while disabled, from the render that disables it, and starts no press', async () => {
    const onFocusChange = focusSpy();
    const rendered: Field[][] = [];
    const onRender = (fields: Field[]): void => {
      rendered.push(fields);
    };
    const screen = await render(<Control onFocusChange={onFocusChange} onRender={onRender} />);
    const element = control().element();
    element.focus();
    enter(element);
    await expect.poll(() => stateOf()).toStrictEqual(['hovered', 'focused', 'focusVisible']);

    await screen.rerender(<Control disabled onFocusChange={onFocusChange} onRender={onRender} />);
    // The render that disables the element already reads a state at rest, and the owner hears
    // the focus go, though the element keeps the focus of the DOM.
    expect(rendered.at(-1)).toStrictEqual([]);
    expect(stateOf()).toStrictEqual([]);
    expect(onFocusChange.mock.calls).toStrictEqual([
      [true, true],
      [false, false],
    ]);
    send(element, 'pointerdown');
    send(element, 'pointerup');

    // Enabled again while still focused: the owner hears the focus come back.
    await screen.rerender(<Control onFocusChange={onFocusChange} onRender={onRender} />);
    await expect.poll(() => stateOf()).toStrictEqual(['hovered', 'focused', 'focusVisible']);
    expect(onFocusChange.mock.calls.at(-1)).toStrictEqual([true, true]);

    // A blur while disabled changes nothing the owner hears, and the pointer is still over it.
    await screen.rerender(<Control disabled onFocusChange={onFocusChange} onRender={onRender} />);
    element.blur();
    await screen.rerender(<Control onFocusChange={onFocusChange} onRender={onRender} />);
    await expect.poll(() => stateOf()).toStrictEqual(['hovered']);
    // No press began while disabled.
    expect(onFocusChange.mock.calls).toStrictEqual([
      [true, true],
      [false, false],
      [true, true],
      [false, false],
    ]);
    leave(element);
  });

  it('hears the focus go for good when the DOM takes it from an element turned unfocusable', async () => {
    const onFocusChange = focusSpy();
    const screen = await render(<Dial onFocusChange={onFocusChange} />);
    const element = control().element();
    element.focus();
    await expect.poll(focusOf).toStrictEqual(['focused', 'focusVisible']);

    await screen.rerender(<Dial disabled onFocusChange={onFocusChange} />);
    // Chromium's focus fixup takes the focus at its next style update, and fires no blur.
    await expect.poll(() => document.activeElement).not.toBe(element);
    await screen.rerender(<Dial onFocusChange={onFocusChange} />);

    expect(focusOf()).toStrictEqual([]);
    expect(onFocusChange.mock.calls).toStrictEqual([
      [true, true],
      [false, false],
    ]);
  });

  it('ends a press as the element turns disabled', async () => {
    const screen = await render(<Control />);
    const element = control().element();
    send(element, 'pointerdown', { pointerType: 'touch', pointerId: 6 });
    await expect.poll(() => stateOf()).toStrictEqual(['pressed']);

    await screen.rerender(<Control disabled />);
    await screen.rerender(<Control />);

    expect(stateOf()).toStrictEqual([]);
    send(element, 'pointerup', { pointerType: 'touch', pointerId: 6 });
  });

  it('hands out a store at rest while disabled, which never changes', async () => {
    const { result } = await renderHook(() => useInteraction({ disabled: true }));
    const { store } = result.current;
    const onChange = vi.fn<() => void>();
    const unsubscribe = store.subscribe(onChange);

    expect(store.getState()).toBe(RESTING_INTERACTION);
    unsubscribe();
    expect(onChange).not.toHaveBeenCalled();
  });
});
