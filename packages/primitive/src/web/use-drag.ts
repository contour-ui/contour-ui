'use client';

import { isDoublePress } from '@contour-ui/core';
import type { PressLike } from '@contour-ui/core';
import { useEffect, useInsertionEffect, useLayoutEffect, useState } from 'react';
import type { CSSProperties, MouseEvent, PointerEvent } from 'react';

import type { DragEndReason, DragOptions } from '../shared/services.ts';
import { focusFromPress } from './focus.ts';
import { lockPointer } from './pointer-lock.ts';
import type { ServiceProps, ServiceResult } from './types.ts';

/**
 * How far a press may travel, in pixels (`|dx| + |dy|` over its moves), and still be the first
 * half of a double press: past it, the press is a drag. The release of a drag is a click to the
 * browser, which the pointer capture keeps on the element, so a quick press after a drag counts as
 * a second click; under the pointer lock the pointer does not even move on screen.
 */
const DRAG_SLOP = 4;

/**
 * The inline style of a dragged element: input, not looks, so it holds without a stylesheet. A
 * touch drag moves the control instead of scrolling the page, and a drag or a double press
 * selects no text.
 */
const DRAG_STYLE: Readonly<CSSProperties> = {
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

/** A press that began a drag: the first half of a double press, until it travels too far. */
interface Press {
  /** A mouse counts its clicks itself (`detail`); touch and pen are compared by time and place. */
  readonly mouse: boolean;
  /** When and where it went down. */
  readonly at: PressLike;
  /** The pixels it moved, `|dx| + |dy|` over its moves. */
  travel: number;
}

/** A drag under way: the pointer that drags, its element, its press, and where it was. */
interface Drag {
  readonly pointerId: number;
  readonly element: Element;
  readonly press: Press;
  /** Where the pointer was at the previous move, in client pixels. */
  x: number;
  y: number;
  /**
   * Whether the drag asked for the pointer lock and has not been refused it: the lock may take
   * the pointer capture, so a lost capture does not end the drag then.
   */
  lock: boolean;
  /** Gives the pointer lock back. */
  release: () => void;
}

/**
 * A press of the mouse between its `pointerdown` and its `mousedown`, where it is decided: the
 * `detail` of `mousedown` counts the clicks by the system's double-click time and distance, and
 * `pointerdown` has none (always 0 in Chromium).
 */
interface PendingPress {
  readonly pointerId: number;
  /**
   * Starts the drag of the press if no `mousedown` decides it: a `pointerdown` cancelled after
   * this element's handlers, by an ancestor's, has no mouse events.
   */
  readonly timer: ReturnType<typeof setTimeout>;
}

/** The drag service of one element: its state, and the props that feed it. */
interface DragController {
  readonly result: ServiceResult;
  readonly setOptions: (options: DragOptions) => void;
  /** The element turned disabled: the drag under way ends, and no press is pending. */
  readonly disable: () => void;
  /** The element unmounted: the drag under way stops without `onEnd`, its lock goes back. */
  readonly unmount: () => void;
}

const noop = (): void => undefined;

function createDrag(initial: DragOptions): DragController {
  let options = initial;
  let drag: Drag | null = null;
  let pending: PendingPress | null = null;
  /** The press of the last drag, while it may still begin a double press. */
  let previous: Press | null = null;

  const dropPending = (): void => {
    if (pending !== null) {
      clearTimeout(pending.timer);
      pending = null;
    }
  };

  /**
   * End the drag under way, if any. A press that ends other than by its release (a cancel, a
   * context menu, a lost pointer, the element turning disabled) was no click, so it begins no
   * double press: a press right after a cancelled one drags.
   */
  const finish = (reason: DragEndReason): void => {
    const current = drag;
    if (current === null) {
      return;
    }
    drag = null;
    if (reason !== 'release' && previous === current.press) {
      previous = null;
    }
    current.release();
    if (current.element.hasPointerCapture(current.pointerId)) {
      current.element.releasePointerCapture(current.pointerId);
    }
    options.onEnd(reason);
  };

  /** Begin the drag of a press: capture the pointer, and lock it if asked to. */
  const begin = (element: Element, pointerId: number, press: Press): void => {
    try {
      element.setPointerCapture(pointerId);
    } catch {
      // Not an active pointer: the moves over the element still drag.
    }
    previous = press;
    const current: Drag = {
      pointerId,
      element,
      press,
      x: press.at.x,
      y: press.at.y,
      lock: options.pointerLock,
      release: noop,
    };
    drag = current;
    options.onStart();
    if (current.lock) {
      current.release = lockPointer(element, {
        onLost: () => {
          if (drag === current) {
            finish('lost');
          }
        },
        onRefused: () => {
          current.lock = false;
        },
      });
    }
  };

  /**
   * Whether a press is the second of a double press: the press before it began a drag that
   * travelled 4 px or less, and the platform takes the two as one, by the click count of a mouse
   * (`detail`, the system's double-click time and distance) or by the time and place of a touch
   * or a pen (`isDoublePress`).
   */
  const isSecondPress = (mouse: boolean, clicks: number, at: PressLike): boolean => {
    const last = previous;
    if (last === null || last.mouse !== mouse || last.travel > DRAG_SLOP) {
      return false;
    }
    return mouse ? clicks >= 2 : isDoublePress(last.at, at);
  };

  /** A press of the primary button: the second of a double press resets, any other drags. */
  const press = (
    element: Element,
    pointerId: number,
    mouse: boolean,
    clicks: number,
    at: PressLike,
  ): void => {
    if (options.disabled || options.readOnly) {
      return;
    }
    if (isSecondPress(mouse, clicks, at)) {
      // It drags nothing; the press after it begins anew.
      previous = null;
      options.onDoublePress();
      return;
    }
    begin(element, pointerId, { mouse, at, travel: 0 });
  };

  const onPointerDown = (event: PointerEvent): void => {
    // The owner's handler runs first: `event.preventDefault()` there keeps the element still.
    if (event.defaultPrevented || event.button !== 0 || options.disabled) {
      return;
    }
    const element = event.currentTarget;
    // The browser focuses an element on a mouse press, with no ring; a touch or a pen that drags
    // at once would not.
    if (event.pointerType !== 'mouse' && element.ownerDocument.activeElement !== element) {
      focusFromPress(element);
    }
    if (options.readOnly) {
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
    dropPending();
    const { pointerId } = event;
    const at: PressLike = { time: event.timeStamp, x: event.clientX, y: event.clientY };
    if (event.pointerType !== 'mouse') {
      press(element, pointerId, false, 0, at);
      return;
    }
    // Decided at `mousedown`, right after this; if none comes, on the next task, as one click.
    pending = {
      pointerId,
      timer: setTimeout(() => {
        if (pending?.pointerId === pointerId) {
          pending = null;
          press(element, pointerId, true, 1, at);
        }
      }),
    };
  };

  const onMouseDown = (event: MouseEvent): void => {
    const current = pending;
    if (current === null || event.button !== 0) {
      return;
    }
    dropPending();
    const at: PressLike = { time: event.timeStamp, x: event.clientX, y: event.clientY };
    press(event.currentTarget, current.pointerId, true, event.detail, at);
  };

  const onPointerMove = (event: PointerEvent): void => {
    const current = drag;
    if (current === null || current.pointerId !== event.pointerId) {
      return;
    }
    // Under the pointer lock, the pointer stays where it is and reports its movement.
    const locked = current.element.ownerDocument.pointerLockElement === current.element;
    const deltaX = locked ? event.movementX : event.clientX - current.x;
    const deltaY = locked ? event.movementY : event.clientY - current.y;
    current.x = event.clientX;
    current.y = event.clientY;
    current.press.travel += Math.abs(deltaX) + Math.abs(deltaY);
    if (deltaX !== 0 || deltaY !== 0) {
      options.onMove({ deltaX, deltaY, shiftKey: event.shiftKey });
    }
  };

  /** The end of a press: its drag ends, and a press still pending never starts. */
  const release = (event: PointerEvent, reason: DragEndReason): void => {
    if (pending?.pointerId === event.pointerId) {
      dropPending();
    }
    if (drag?.pointerId === event.pointerId) {
      finish(reason);
    }
  };

  const props: ServiceProps = {
    style: DRAG_STYLE,
    onPointerDown,
    onMouseDown,
    onPointerMove,
    onPointerUp: (event) => {
      release(event, 'release');
    },
    onPointerCancel: (event) => {
      release(event, 'cancel');
    },
    onLostPointerCapture: (event) => {
      // The pointer lock may take the capture: the drag goes on, and the lock ends it.
      if (drag?.pointerId === event.pointerId && !drag.lock) {
        finish('lost');
      }
    },
    onContextMenu: () => {
      // A context menu takes the release (Control and a click on macOS): the drag ends here.
      dropPending();
      finish('contextmenu');
    },
  };

  return {
    result: { props, ref: undefined },
    setOptions: (next) => {
      options = next;
    },
    disable: () => {
      dropPending();
      previous = null;
      finish('disabled');
    },
    unmount: () => {
      dropPending();
      const current = drag;
      drag = null;
      current?.release();
    },
  };
}

/**
 * A drag of the primary button on the DOM (see `DragOptions`): the element captures the pointer
 * (`setPointerCapture`), so the moves reach it wherever the pointer goes, and reports the client
 * pixels of each move, or the movement of the pointer under the pointer lock. A touch or a pen
 * focuses the element from code as it goes down (a mouse press takes the focus by itself), with
 * no focus ring. A mouse press begins at its `mousedown`, whose click count (`detail`) tells the
 * second press of a double click by the system's settings; touch and pen tell it at
 * `pointerdown` (`isDoublePress` of `@contour-ui/core`).
 *
 * Spread `props` on the element through `mergeProps`, before the element's own props, so that
 * its handlers and the owner's run first: `event.preventDefault()` on `pointerdown` there keeps
 * the element still. The props include `style` (`touch-action: none`, `user-select: none`).
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
