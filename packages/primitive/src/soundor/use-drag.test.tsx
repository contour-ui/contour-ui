import { act, advanceTime, fireEvent, render, screen } from '@soundor/testing-library/react';
import { pointerLockNode } from 'soundor:ui';
import type { PointerEvent } from 'soundor:ui';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';

import type { DragEndReason, DragMove, DragOptions } from '../shared/services.ts';
import { mergeProps } from './merge-props.ts';
import { Primitive } from './primitive.ts';
import type { PrimitiveProps } from './types.ts';
import { useDrag } from './use-drag.ts';

type Node = ReturnType<typeof screen.getByRole>;

interface ProbeProps extends Partial<DragOptions> {
  /** The owner's handler, which runs before the service's. */
  readonly onPointerDown?: (event: PointerEvent) => void;
}

/** The control a drag serves: a slider, as a knob's is. */
const CONTROL: PrimitiveProps<'svg'> = { role: 'slider', tabIndex: 0, 'aria-label': 'Probe' };

/** An element that drags, and another one, to move the pointer over. */
function Probe({ onPointerDown, ...options }: ProbeProps): ReactElement {
  const drag = useDrag({
    disabled: false,
    readOnly: false,
    pointerLock: false,
    onStart: () => undefined,
    onMove: () => undefined,
    onEnd: () => undefined,
    onDoublePress: () => undefined,
    ...options,
  });
  return (
    <>
      <Primitive.svg {...mergeProps(drag.props, CONTROL, { onPointerDown })} />
      <Primitive.button>Other</Primitive.button>
    </>
  );
}

/** The probe with spies on every callback. */
async function setup(options: Partial<DragOptions> = {}) {
  const spies = {
    onStart: vi.fn<() => void>(),
    onMove: vi.fn<(move: DragMove) => void>(),
    onEnd: vi.fn<(reason: DragEndReason) => void>(),
    onDoublePress: vi.fn<() => void>(),
  };
  const view = (next: Partial<DragOptions>): ReactElement => <Probe {...spies} {...next} />;
  const { rerender, unmount } = await render(view(options));
  return {
    ...spies,
    control: screen.getByRole('adjustable', { name: 'Probe' }),
    other: screen.getByRole('button', { name: 'Other' }),
    rerender: (next: Partial<DragOptions>) => rerender(view(next)),
    unmount,
  };
}

/** Press the control and release it in place: a click. */
function click(control: Node, init: { clientX?: number } = {}): void {
  fireEvent.pointerDown(control, init);
  fireEvent.pointerUp(control, init);
}

describe('useDrag on Soundor', () => {
  it('drags from a press of the primary button to its release, move by move', async () => {
    const { control, onStart, onMove, onEnd } = await setup();
    fireEvent.pointerDown(control);
    expect(onStart).toHaveBeenCalledOnce();
    fireEvent.pointerMove(control, { movementX: 3, movementY: -20 });
    fireEvent.pointerMove(control, { movementY: 10, shiftKey: true });
    // A move of nothing is no move.
    fireEvent.pointerMove(control);
    expect(onMove.mock.calls).toEqual([
      [{ deltaX: 3, deltaY: -20, shiftKey: false }],
      [{ deltaX: 0, deltaY: 10, shiftKey: true }],
    ]);
    fireEvent.pointerUp(control);
    expect(onEnd).toHaveBeenCalledExactlyOnceWith('release');
    fireEvent.pointerMove(control, { movementY: 10 });
    expect(onMove).toHaveBeenCalledTimes(2);
  });

  it('follows the moves of the press wherever the pointer goes', async () => {
    const { control, other, onMove, onEnd } = await setup();
    fireEvent.pointerDown(control);
    // The press keeps the pointer: its moves and its release reach the control.
    fireEvent.pointerMove(other, { movementY: -40 });
    expect(onMove).toHaveBeenCalledExactlyOnceWith({ deltaX: 0, deltaY: -40, shiftKey: false });
    fireEvent.pointerUp(other);
    expect(onEnd).toHaveBeenCalledExactlyOnceWith('release');
  });

  it('drags with the primary button only', async () => {
    const { control, onStart } = await setup();
    fireEvent.pointerDown(control, { button: 2 });
    fireEvent.pointerUp(control, { button: 2 });
    expect(onStart).not.toHaveBeenCalled();
  });

  it('ends with a cancel of the press, and with a context menu, which may take the release', async () => {
    const { control, onEnd } = await setup();
    fireEvent.pointerDown(control);
    fireEvent.pointerCancel(control);
    expect(onEnd).toHaveBeenLastCalledWith('cancel');
    fireEvent.pointerDown(control);
    // The secondary button, or Control and a click on macOS.
    fireEvent.pointerDown(control, { button: 2 });
    expect(onEnd).toHaveBeenLastCalledWith('contextmenu');
    expect(onEnd).toHaveBeenCalledTimes(2);
  });

  it('drags with the first pointer, and ignores a second one meanwhile', async () => {
    const { control, onStart, onMove, onEnd } = await setup();
    fireEvent.pointerDown(control, { pointerId: 1 });
    fireEvent.pointerDown(control, { pointerId: 2 });
    fireEvent.pointerMove(control, { pointerId: 2, movementY: -40 });
    fireEvent.pointerUp(control, { pointerId: 2 });
    expect(onStart).toHaveBeenCalledOnce();
    expect(onMove).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
    fireEvent.pointerMove(control, { pointerId: 1, movementY: -20 });
    fireEvent.pointerUp(control, { pointerId: 1 });
    expect(onMove).toHaveBeenCalledOnce();
    expect(onEnd).toHaveBeenCalledExactlyOnceWith('release');
  });

  it('ends a drag whose release went astray when its pointer presses again', async () => {
    const { control, onStart, onEnd } = await setup();
    await advanceTime(600);
    fireEvent.pointerDown(control);
    await advanceTime(600);
    fireEvent.pointerDown(control);
    expect(onEnd).toHaveBeenCalledExactlyOnceWith('lost');
    expect(onStart).toHaveBeenCalledTimes(2);
  });

  it('stays still when the owner prevents the press', async () => {
    const onStart = vi.fn<() => void>();
    await render(
      <Probe
        onStart={onStart}
        onPointerDown={(event) => {
          event.preventDefault();
        }}
      />,
    );
    fireEvent.pointerDown(screen.getByRole('adjustable', { name: 'Probe' }));
    expect(onStart).not.toHaveBeenCalled();
  });

  it('takes no press while disabled, and ends the drag under way when it turns so', async () => {
    const { control, rerender, onStart, onEnd } = await setup({ disabled: true });
    fireEvent.pointerDown(control);
    fireEvent.pointerUp(control);
    expect(onStart).not.toHaveBeenCalled();
    await rerender({ disabled: false });
    fireEvent.pointerDown(control);
    await rerender({ disabled: true });
    expect(onEnd).toHaveBeenCalledExactlyOnceWith('disabled');
    // The release of that press ends nothing more.
    fireEvent.pointerUp(control);
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('starts nothing while read-only, though the press focuses the control', async () => {
    const { control, onStart, onDoublePress } = await setup({ readOnly: true });
    click(control);
    click(control);
    expect(control).toHaveFocus();
    expect(onStart).not.toHaveBeenCalled();
    expect(onDoublePress).not.toHaveBeenCalled();
  });

  describe('double press', () => {
    it('takes a second press in time and in place as a double press, which drags nothing', async () => {
      const { control, onStart, onEnd, onMove, onDoublePress } = await setup();
      click(control);
      await advanceTime(200);
      fireEvent.pointerDown(control);
      expect(onDoublePress).toHaveBeenCalledOnce();
      fireEvent.pointerMove(control, { movementY: -20 });
      fireEvent.pointerUp(control);
      // One gesture for the first press, none for the second.
      expect(onStart).toHaveBeenCalledOnce();
      expect(onEnd).toHaveBeenCalledOnce();
      expect(onMove).not.toHaveBeenCalled();
      // The press after a double press begins anew.
      fireEvent.pointerDown(control);
      expect(onStart).toHaveBeenCalledTimes(2);
      expect(onDoublePress).toHaveBeenCalledOnce();
    });

    it('takes no press that moved, and no press far in time or place, for a double press', async () => {
      const { control, onStart, onDoublePress } = await setup();
      // A drag, then a press at once: the drag was no click.
      fireEvent.pointerDown(control);
      fireEvent.pointerMove(control, { movementY: -5 });
      fireEvent.pointerUp(control);
      click(control);
      // Two clicks too far apart in time…
      await advanceTime(600);
      click(control);
      // …or in place.
      await advanceTime(600);
      click(control, { clientX: 0 });
      click(control, { clientX: 20 });
      expect(onDoublePress).not.toHaveBeenCalled();
      expect(onStart).toHaveBeenCalledTimes(5);
    });

    it('takes no press that ended without its release for the first half of one', async () => {
      const { control, onStart, onDoublePress } = await setup();
      fireEvent.pointerDown(control);
      fireEvent.pointerCancel(control);
      fireEvent.pointerDown(control);
      fireEvent.pointerDown(control, { button: 2 });
      fireEvent.pointerDown(control);
      fireEvent.pointerUp(control);
      expect(onDoublePress).not.toHaveBeenCalled();
      expect(onStart).toHaveBeenCalledTimes(3);
    });

    it('takes a press that moved 4 px or less as the first half of a double press', async () => {
      const { control, onDoublePress } = await setup();
      fireEvent.pointerDown(control);
      fireEvent.pointerMove(control, { movementX: 2, movementY: -2 });
      fireEvent.pointerUp(control);
      fireEvent.pointerDown(control);
      expect(onDoublePress).toHaveBeenCalledOnce();
    });

    it('forgets the first press when the control turns disabled', async () => {
      const { control, rerender, onDoublePress } = await setup();
      click(control);
      await rerender({ disabled: true });
      await rerender({ disabled: false });
      fireEvent.pointerDown(control);
      expect(onDoublePress).not.toHaveBeenCalled();
    });
  });

  describe('pointer lock', () => {
    it('locks the pointer to the control while it drags, with pointerLock', async () => {
      const { control, onMove } = await setup({ pointerLock: true });
      fireEvent.pointerDown(control);
      expect(pointerLockNode()).toBe(control);
      fireEvent.pointerMove(control, { movementY: -20 });
      expect(onMove).toHaveBeenCalledOnce();
      fireEvent.pointerUp(control);
      expect(pointerLockNode()).toBeNull();
    });

    it('gives the lock back when the press is cancelled, or the control turns disabled', async () => {
      const { control, rerender } = await setup({ pointerLock: true });
      fireEvent.pointerDown(control);
      fireEvent.pointerCancel(control);
      expect(pointerLockNode()).toBeNull();
      fireEvent.pointerDown(control);
      expect(pointerLockNode()).toBe(control);
      await rerender({ pointerLock: true, disabled: true });
      expect(pointerLockNode()).toBeNull();
    });

    it('drags unlocked without pointerLock', async () => {
      const { control, onMove } = await setup();
      fireEvent.pointerDown(control);
      expect(pointerLockNode()).toBeNull();
      fireEvent.pointerMove(control, { movementY: -20 });
      fireEvent.pointerUp(control);
      expect(onMove).toHaveBeenCalledOnce();
    });

    it('drags unlocked when the lock is refused, as it is to a touch', async () => {
      const { control, onMove, onEnd } = await setup({ pointerLock: true });
      fireEvent.pointerDown(control, { pointerType: 'touch' });
      // The refusal settles: the press goes on.
      await act(async () => {
        await Promise.resolve();
      });
      expect(pointerLockNode()).toBeNull();
      fireEvent.pointerMove(control, { movementY: -20, pointerType: 'touch' });
      fireEvent.pointerUp(control, { pointerType: 'touch' });
      expect(onMove).toHaveBeenCalledOnce();
      expect(onEnd).toHaveBeenCalledExactlyOnceWith('release');
    });

    it('gives the lock back when the control unmounts in the middle of a drag, ending nothing', async () => {
      const { control, unmount, onEnd } = await setup({ pointerLock: true });
      fireEvent.pointerDown(control);
      expect(pointerLockNode()).toBe(control);
      await unmount();
      expect(pointerLockNode()).toBeNull();
      expect(onEnd).not.toHaveBeenCalled();
    });
  });
});
