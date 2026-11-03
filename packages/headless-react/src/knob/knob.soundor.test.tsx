/*
 * The Knob on Soundor only: what Soundor's own vocabulary says (`adjustable`, `focusable`, the
 * actions of assistive technology), the scene of the dial, the pointer lock of `soundor:ui`, and
 * the details of a press that only the simulation lets a test send one event at a time. The
 * behavior both platforms share is in `knob.test.tsx`.
 */
import { knob } from '@contour-ui/core';
import { Primitive } from '@contour-ui/primitive';
import {
  act,
  advanceTime,
  fireEvent,
  render,
  screen,
  userEvent,
} from '@soundor/testing-library/react';
import { pointerLockNode } from 'soundor:ui';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import * as Knob from './index.ts';
import { useKnobContext } from './knob-context.ts';
import type { UseKnobReturn } from './use-knob.ts';

type Node = ReturnType<typeof screen.getByRole>;

const changeSpy = () => vi.fn<(details: knob.ValueChangeDetails) => void>();

/** Calls `onRender` with the API the parts see, on every render. */
function Spy({ onRender }: { readonly onRender: (api: UseKnobReturn) => void }): null {
  onRender(useKnobContext());
  return null;
}

interface GainProps extends Knob.RootProps {
  readonly onRender?: (api: UseKnobReturn) => void;
}

/** A labelled knob with every part. */
function Gain({ onRender, ...props }: GainProps): ReactElement {
  return (
    <Knob.Root {...props}>
      <Knob.Label>Gain</Knob.Label>
      <Knob.Control width={40} height={40}>
        <Knob.Track />
        <Knob.Range />
        <Knob.Thumb />
      </Knob.Control>
      <Knob.ValueText />
      {onRender === undefined ? null : <Spy onRender={onRender} />}
    </Knob.Root>
  );
}

/** A knob, and another control to move the focus to. */
async function setup(props: Knob.RootProps = {}) {
  const renders: UseKnobReturn[] = [];
  const onRender = (api: UseKnobReturn): void => {
    renders.push(api);
  };
  const view = (next: Knob.RootProps): ReactElement => (
    <Primitive.div>
      <Gain {...next} onRender={onRender} />
      <Primitive.button>Other</Primitive.button>
    </Primitive.div>
  );
  const user = userEvent.setup();
  const { rerender } = await render(view(props));
  const control = screen.getByRole('adjustable', { name: 'Gain' });
  return {
    user,
    control,
    other: screen.getByRole('button', { name: 'Other' }),
    /** The API after the last render. */
    api: (): UseKnobReturn => {
      const api = renders.at(-1);
      if (api === undefined) {
        throw new Error('The knob has not rendered.');
      }
      return api;
    },
    /** The value, as assistive technology reads it. */
    now: () => control.accessibility.value?.now,
    rerender: (next: Knob.RootProps) => rerender(view(next)),
  };
}

/** Press the control, move the pointer by each of `moves` (positive downwards), and release it. */
function drag(control: Node, moves: readonly number[], init: { shiftKey?: boolean } = {}): void {
  fireEvent.pointerDown(control);
  for (const movementY of moves) {
    fireEvent.pointerMove(control, { movementY, ...init });
  }
  fireEvent.pointerUp(control);
}

/** A wheel event over the control, in pixels unless `deltaMode` says otherwise. */
const wheel = (control: Node, init: Record<string, unknown>) =>
  fireEvent(control, 'wheel', { deltaX: 0, deltaY: 0, deltaMode: 0, ...init });

/** The shapes the control draws: the track, the range and the thumb. */
const shapesOf = (control: Node) => control.svgScene?.children ?? [];

afterEach(() => {
  vi.useRealTimers();
});

describe('Knob on Soundor', () => {
  describe('parts', () => {
    it('is an adjustable control, focusable, with the actions of assistive technology', async () => {
      const { control } = await setup({ defaultValue: 50 });
      expect(control.accessibility).toMatchObject({
        role: 'adjustable',
        label: 'Gain',
        actions: [{ name: 'increment' }, { name: 'decrement' }, { name: 'setValue' }],
      });
      expect(control.focusable).toBe(true);
    });

    it('reads the text of the label as the name of the control, not on its own', async () => {
      await setup({ defaultValue: 25, formatValue: (value) => `${value} %` });
      expect(screen.getByText('Gain')).toBeDefined();
      expect(screen.queryByRole('text', { name: 'Gain' })).toBeNull();
      expect(screen.queryByRole('text', { name: '25 %' })).toBeNull();
    });

    it('replaces the scene of the dial when the value changes, and only then', async () => {
      const { control, user } = await setup({ defaultValue: 0 });
      expect(shapesOf(control)[1]).toMatchObject({ type: 'path', d: '' });
      const updates = control.svgSceneUpdates;
      await user.tab();
      await user.keyboard('{ArrowUp}');
      expect(shapesOf(control)[1]).toMatchObject({ d: knob.getGeometry(0.01, 0).range.d });
      await user.keyboard('{Home}');
      expect(shapesOf(control)[1]).toMatchObject({ type: 'path', d: '' });
      expect(control.svgSceneUpdates).toBe(updates + 2);
    });
  });

  describe('drag', () => {
    it('drags from the press to the release, move by move, and Shift slows it', async () => {
      const { control, api, now } = await setup({ defaultValue: 50 });
      fireEvent.pointerDown(control);
      expect(api().dragging).toBe(true);
      fireEvent.pointerMove(control, { movementY: -20 });
      expect(now()).toBe(60);
      fireEvent.pointerMove(control, { movementY: 40 });
      expect(now()).toBe(40);
      fireEvent.pointerMove(control, { movementY: -20, shiftKey: true });
      expect(now()).toBe(41);
      fireEvent.pointerUp(control);
      expect(api().dragging).toBe(false);
    });

    it('counts vertical moves only, and follows them wherever the pointer goes', async () => {
      const { control, other, now } = await setup({ defaultValue: 50 });
      fireEvent.pointerDown(control);
      fireEvent.pointerMove(control, { movementX: 40 });
      expect(now()).toBe(50);
      // The press keeps the pointer: its moves reach the control.
      fireEvent.pointerMove(other, { movementY: -40 });
      expect(now()).toBe(70);
      fireEvent.pointerUp(other);
    });

    it('drags with the primary button only', async () => {
      const { control, api, now } = await setup({ defaultValue: 50 });
      fireEvent.pointerDown(control, { button: 2 });
      fireEvent.pointerMove(control, { movementY: -20 });
      expect(api().dragging).toBe(false);
      expect(now()).toBe(50);
      fireEvent.pointerUp(control, { button: 2 });
    });

    it('ends with a cancel of the press', async () => {
      const { control, api, now } = await setup({ defaultValue: 50 });
      fireEvent.pointerDown(control);
      fireEvent.pointerMove(control, { movementY: -20 });
      fireEvent.pointerCancel(control);
      expect(api().dragging).toBe(false);
      fireEvent.pointerMove(control, { movementY: -20 });
      expect(now()).toBe(60);
    });

    it('ends with a context menu, which may take the release', async () => {
      const onValueChangeEnd = changeSpy();
      const { control, api, now } = await setup({ defaultValue: 50, onValueChangeEnd });
      fireEvent.pointerDown(control);
      fireEvent.pointerMove(control, { movementY: -20 });
      // The secondary button, or Control and a click on macOS.
      fireEvent.pointerDown(control, { button: 2 });
      expect(api().dragging).toBe(false);
      expect(onValueChangeEnd).toHaveBeenCalledExactlyOnceWith({ value: 60 });
      fireEvent.pointerMove(control, { movementY: -20 });
      expect(now()).toBe(60);
    });

    it('drags with the first pointer, and ignores a second one meanwhile', async () => {
      const { control, api, now } = await setup({ defaultValue: 50 });
      fireEvent.pointerDown(control, { pointerId: 1 });
      fireEvent.pointerDown(control, { pointerId: 2 });
      fireEvent.pointerMove(control, { pointerId: 2, movementY: -40 });
      expect(now()).toBe(50);
      fireEvent.pointerUp(control, { pointerId: 2 });
      expect(api().dragging).toBe(true);
      fireEvent.pointerMove(control, { pointerId: 1, movementY: -20 });
      expect(now()).toBe(60);
      fireEvent.pointerUp(control, { pointerId: 1 });
      expect(api().dragging).toBe(false);
    });
  });

  describe('pointer lock', () => {
    it('locks the pointer to the control while it drags, with pointerLock', async () => {
      const { control, now } = await setup({ defaultValue: 50, pointerLock: true });
      fireEvent.pointerDown(control);
      expect(pointerLockNode()).toBe(control);
      fireEvent.pointerMove(control, { movementY: -20 });
      expect(now()).toBe(60);
      fireEvent.pointerUp(control);
      expect(pointerLockNode()).toBeNull();
    });

    it('gives the lock back when the press is cancelled', async () => {
      const { control, api } = await setup({ pointerLock: true });
      fireEvent.pointerDown(control);
      fireEvent.pointerCancel(control);
      expect(pointerLockNode()).toBeNull();
      expect(api().dragging).toBe(false);
    });

    it('drags unlocked without pointerLock', async () => {
      const { control, now } = await setup({ defaultValue: 50 });
      fireEvent.pointerDown(control);
      expect(pointerLockNode()).toBeNull();
      fireEvent.pointerMove(control, { movementY: -20 });
      fireEvent.pointerUp(control);
      expect(now()).toBe(60);
    });

    it('drags unlocked when the lock is refused, as it is to a touch', async () => {
      const { control, now } = await setup({ defaultValue: 50, pointerLock: true });
      fireEvent.pointerDown(control, { pointerType: 'touch' });
      // The refusal settles: the press goes on.
      await act(async () => {
        await Promise.resolve();
      });
      expect(pointerLockNode()).toBeNull();
      fireEvent.pointerMove(control, { movementY: -20 });
      fireEvent.pointerUp(control);
      expect(now()).toBe(60);
    });
  });

  describe('wheel', () => {
    it('takes a wheel that counts lines, as some mice do', async () => {
      const { control, now } = await setup({ defaultValue: 45 });
      expect(wheel(control, { deltaY: -3, deltaMode: 1 }).defaultPrevented).toBe(true);
      expect(now()).toBe(47.4);
    });
  });

  describe('assistive technology', () => {
    it('steps on increment and decrement, and takes a value it is given', async () => {
      const { control, now } = await setup({ defaultValue: 50 });
      const increment = fireEvent.accessibilityAction(control, { actionName: 'increment' });
      expect(increment.defaultPrevented).toBe(true);
      expect(now()).toBe(51);
      fireEvent.accessibilityAction(control, { actionName: 'decrement' });
      fireEvent.accessibilityAction(control, { actionName: 'decrement' });
      expect(now()).toBe(49);
      fireEvent.accessibilityAction(control, { actionName: 'setValue', value: 75 });
      expect(now()).toBe(75);
      fireEvent.accessibilityAction(control, { actionName: 'setValue', value: '20' });
      expect(now()).toBe(20);
      fireEvent.accessibilityAction(control, { actionName: 'setValue', value: 500 });
      expect(now()).toBe(100);
    });

    it('leaves the actions it does not handle to the runtime', async () => {
      const { control, now } = await setup({ defaultValue: 50 });
      const text = fireEvent.accessibilityAction(control, { actionName: 'setValue', value: 'x' });
      const activate = fireEvent.accessibilityAction(control, { actionName: 'activate' });
      expect(text.defaultPrevented).toBe(false);
      expect(activate.defaultPrevented).toBe(false);
      expect(now()).toBe(50);
    });

    it('reports a change of assistive technology with a start and an end', async () => {
      const onValueChangeStart = changeSpy();
      const onValueChangeEnd = changeSpy();
      const { control } = await setup({ defaultValue: 50, onValueChangeStart, onValueChangeEnd });
      fireEvent.accessibilityAction(control, { actionName: 'setValue', value: 10 });
      expect(onValueChangeStart).toHaveBeenCalledExactlyOnceWith({ value: 50 });
      expect(onValueChangeEnd).toHaveBeenCalledExactlyOnceWith({ value: 10 });
    });
  });

  describe('double press', () => {
    it('resets the value at the second press, which drags nothing', async () => {
      const onValueChangeEnd = changeSpy();
      const { control, api, now } = await setup({ defaultValue: 50, onValueChangeEnd });
      drag(control, [-40]);
      expect(now()).toBe(70);
      await advanceTime(600);
      drag(control, []);
      await advanceTime(200);
      fireEvent.pointerDown(control);
      expect(now()).toBe(50);
      expect(onValueChangeEnd).toHaveBeenLastCalledWith({ value: 50 });
      expect(api().dragging).toBe(false);
      fireEvent.pointerMove(control, { movementY: -20 });
      expect(now()).toBe(50);
      fireEvent.pointerUp(control);
    });

    it('takes no press that moved, and no press far in time or place, for a double press', async () => {
      const { control, api, now } = await setup({ defaultValue: 50 });
      // A drag, then a press at once: the drag was no click.
      drag(control, [-10]);
      fireEvent.pointerDown(control);
      expect(api().dragging).toBe(true);
      fireEvent.pointerUp(control);
      expect(now()).toBe(55);
      // Two clicks too far apart in time…
      await advanceTime(600);
      drag(control, []);
      await advanceTime(600);
      fireEvent.pointerDown(control);
      expect(api().dragging).toBe(true);
      fireEvent.pointerUp(control);
      // …or in place.
      await advanceTime(600);
      fireEvent.pointerDown(control, { clientX: 0 });
      fireEvent.pointerUp(control, { clientX: 0 });
      fireEvent.pointerDown(control, { clientX: 20 });
      expect(api().dragging).toBe(true);
      fireEvent.pointerUp(control, { clientX: 20 });
      expect(now()).toBe(55);
    });
  });

  describe('disabled and read-only', () => {
    it('is not focusable while disabled, and offers assistive technology no action', async () => {
      const { control, now } = await setup({ defaultValue: 50, disabled: true });
      expect(control.focusable).toBe(false);
      expect(control.accessibility).toMatchObject({ state: { disabled: true }, actions: [] });
      fireEvent.accessibilityAction(control, { actionName: 'increment' });
      fireEvent(control, 'pointerenter');
      expect(now()).toBe(50);
    });

    it('turns focusable again when it turns enabled', async () => {
      const { control, rerender } = await setup({ defaultValue: 50, disabled: true });
      expect(control.focusable).toBe(false);
      await rerender({ defaultValue: 50 });
      expect(control.focusable).toBe(true);
    });

    it('ends a drag when it turns disabled, and its release ends nothing more', async () => {
      const onValueChangeEnd = changeSpy();
      const { control, api, rerender } = await setup({ defaultValue: 50, onValueChangeEnd });
      fireEvent.pointerDown(control);
      fireEvent.pointerMove(control, { movementY: -20 });
      await rerender({ defaultValue: 50, onValueChangeEnd, disabled: true });
      expect(api().dragging).toBe(false);
      expect(onValueChangeEnd).toHaveBeenCalledExactlyOnceWith({ value: 60 });
      fireEvent.pointerUp(control);
      expect(onValueChangeEnd).toHaveBeenCalledOnce();
    });

    it('takes focus while read-only, but no action and no double press', async () => {
      const { control, now } = await setup({ defaultValue: 50, readOnly: true });
      expect(control.focusable).toBe(true);
      expect(control.accessibility.actions).toEqual([]);
      fireEvent.accessibilityAction(control, { actionName: 'increment' });
      await advanceTime(600);
      drag(control, []);
      drag(control, []);
      expect(now()).toBe(50);
    });
  });
});
