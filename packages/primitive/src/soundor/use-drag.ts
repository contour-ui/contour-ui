import { isDoublePress } from '@contour-ui/core';
import type { PressLike } from '@contour-ui/core';
import { exitPointerLock, pointerLockNode } from 'soundor:ui';
import type { PointerEvent, UiNode } from 'soundor:ui';
import { useEffect, useInsertionEffect, useLayoutEffect, useState } from 'react';

import type { DragEndReason, DragOptions } from '../shared/services.ts';
import type { ServiceProps, ServiceResult } from './types.ts';

/**
 * How far a press may travel, in pixels (`|dx| + |dy|` over its moves), and still be the first
 * half of a double press: past it, the press is a drag, and the press after it begins another.
 */
const DRAG_SLOP = 4;

/** A press that began a drag: the first half of a double press, until it travels too far. */
interface Press {
  /** When and where it went down: the runtime's `timeStamp`, and `pageX`, `pageY`. */
  readonly at: PressLike;
  /** The pixels it moved, `|dx| + |dy|` over its moves. */
  travel: number;
}

/** A drag under way: the pointer that drags, the node it pressed, and its press. */
interface Drag {
  readonly pointerId: number;
  /** The node that took the press, which may hold the pointer lock. */
  readonly node: UiNode | null;
  readonly press: Press;
}

/** The drag service of one element: its state, and the props that feed it. */
interface DragController {
  readonly result: ServiceResult;
  readonly setOptions: (options: DragOptions) => void;
  /** The element turned disabled: the drag under way ends, and no press begins a double one. */
  readonly disable: () => void;
  /** The element unmounted: the drag under way stops without `onEnd`, its lock goes back. */
  readonly unmount: () => void;
}

/** Give the pointer lock back, if `node` holds it: a release does by itself, a cancel may not. */
function unlock(node: UiNode | null): void {
  if (node !== null && pointerLockNode() === node) {
    exitPointerLock();
  }
}

function createDrag(initial: DragOptions): DragController {
  let options = initial;
  let drag: Drag | null = null;
  /** The press of the last drag, while it may still begin a double press. */
  let previous: Press | null = null;

  /** End the drag under way, if any. */
  const finish = (reason: DragEndReason): void => {
    const current = drag;
    if (current === null) {
      return;
    }
    drag = null;
    if (reason !== 'release') {
      // A press the platform or a menu took, or that went astray, was no click.
      previous = null;
    }
    unlock(current.node);
    options.onEnd(reason);
  };

  const onPointerDown = (event: PointerEvent): void => {
    // The owner's handler runs first: `event.preventDefault()` there keeps the element still. A
    // read-only element takes the focus of the press (the runtime gives it), and nothing else.
    if (event.defaultPrevented || event.button !== 0 || options.disabled || options.readOnly) {
      return;
    }
    if (drag !== null) {
      // Another finger: the first one drags.
      if (drag.pointerId !== event.pointerId) {
        return;
      }
      // The release of the last press went astray: that drag ends first.
      finish('lost');
    }
    const at: PressLike = { time: event.timeStamp, x: event.pageX, y: event.pageY };
    const last = previous;
    if (last !== null && last.travel <= DRAG_SLOP && isDoublePress(last.at, at)) {
      // The second press of a double press drags nothing; the press after it begins anew.
      previous = null;
      options.onDoublePress();
      return;
    }
    const press: Press = { at, travel: 0 };
    previous = press;
    const node = event.currentTarget;
    drag = { pointerId: event.pointerId, node, press };
    options.onStart();
    if (options.pointerLock && node !== null) {
      node.requestPointerLock().catch(() => {
        // Refused (a touch, or a browser that says no to the web runtime): the press drags on,
        // unlocked.
      });
    }
  };

  const onPointerMove = (event: PointerEvent): void => {
    const current = drag;
    if (current === null || current.pointerId !== event.pointerId) {
      return;
    }
    // Soundor reports how far the pointer moved, locked or not, and the press keeps the pointer:
    // its moves reach the element wherever they are.
    const { movementX: deltaX, movementY: deltaY } = event;
    current.press.travel += Math.abs(deltaX) + Math.abs(deltaY);
    if (deltaX !== 0 || deltaY !== 0) {
      options.onMove({ deltaX, deltaY, shiftKey: event.shiftKey });
    }
  };

  const props: ServiceProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp: (event) => {
      if (drag?.pointerId === event.pointerId) {
        finish('release');
      }
    },
    onPointerCancel: (event) => {
      if (drag?.pointerId === event.pointerId) {
        finish('cancel');
      }
    },
    onContextMenu: () => {
      // A context menu takes the release (the secondary button, or Control and a click on
      // macOS): the drag ends here, or it would go on with no button held.
      finish('contextmenu');
    },
  };

  return {
    result: { props, ref: undefined },
    setOptions: (next) => {
      options = next;
    },
    disable: () => {
      previous = null;
      finish('disabled');
    },
    unmount: () => {
      const current = drag;
      drag = null;
      unlock(current?.node ?? null);
    },
  };
}

/**
 * A drag of the primary button on Soundor (see `DragOptions`): the press keeps the pointer by
 * itself, so its moves and its release reach the element wherever they are, and each move reports
 * how far the pointer went (`movementX`, `movementY`), under the pointer lock too
 * (`node.requestPointerLock()`). The runtime focuses a focusable element as it is pressed. The
 * second press of a double press is told at `pointerdown`, by the time and place of the two
 * presses (`isDoublePress` of `@contour-ui/core`), and drags nothing.
 *
 * Spread `props` on the element through `mergeProps`, before the element's own props, so that its
 * handlers and the owner's run first: `event.preventDefault()` on `pointerdown` there keeps the
 * element still.
 *
 * @example
 * const drag = useDrag({
 *   disabled, readOnly, pointerLock,
 *   onStart: api.startDrag,
 *   onMove: ({ deltaY, shiftKey }) => { api.moveDrag(deltaY, shiftKey); },
 *   onEnd: api.endDrag,
 *   onDoublePress: api.resetValue,
 * });
 * <Primitive.svg {...mergeProps(drag.props, ownProps, props)} />
 */
export function useDrag(options: DragOptions): ServiceResult {
  const [controller] = useState(() => createDrag(options));
  useInsertionEffect(() => {
    controller.setOptions(options);
  });
  const { disabled } = options;
  // Before paint, so that no move of the pointer reaches a drag of a disabled element.
  useLayoutEffect(() => {
    if (disabled) {
      controller.disable();
    }
  }, [controller, disabled]);
  useEffect(
    () => () => {
      controller.unmount();
    },
    [controller],
  );
  return controller.result;
}
