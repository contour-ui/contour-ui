'use client';

import { getRangeIntent, getRangeWheelDelta, knob } from '@contour-ui/core';
import type { Platform, Service } from '@contour-ui/core';
import { useMachine } from '@contour-ui/core/react';
import { useCallback, useId, useRef, useState } from 'react';
import type {
  CSSProperties,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  RefCallback,
  RefObject,
} from 'react';

import { schedule } from '../platform/clock.ts';

/**
 * Props of {@link useKnob}: the input of the knob machine of `@contour-ui/core`, the pointer lock
 * of a drag, and the attributes of the hidden input that takes the value into a form.
 */
export interface UseKnobProps extends knob.Input {
  /**
   * Lock the pointer to the control while it drags the knob (`requestPointerLock()`): the
   * pointer hides, and the drag has no edge of the screen to stop at. It is released with the
   * press, or when the user leaves it (Escape), which ends the drag.
   *
   * @defaultValue false
   */
  readonly pointerLock?: boolean | undefined;
  /** The name under which a form submits the value (`Knob.HiddenInput`). */
  readonly name?: string | undefined;
  /** The id of the form the hidden input belongs to, when it is outside of it. */
  readonly form?: string | undefined;
}

/** The state of the knob, as every part carries it. */
export interface KnobPartAttributes<Part extends string> {
  readonly 'data-scope': 'knob';
  readonly 'data-part': Part;
  /** Present, empty, while the knob is disabled. */
  readonly 'data-disabled': '' | undefined;
  /** Present, empty, while the knob is read-only. */
  readonly 'data-readonly': '' | undefined;
  /** Present, empty, while the user drags the knob. */
  readonly 'data-dragging': '' | undefined;
}

/** The custom properties of the root, for a dial of one's own. */
export interface KnobRootStyle extends CSSProperties {
  /** The position of the value on the travel, from `0` at `min` to `1` at `max`, by the scale. */
  readonly '--knob-position': string;
  /** The angle of the value, clockwise from the top: `-135deg` at `min`, `135deg` at `max`. */
  readonly '--knob-angle': string;
}

/** Props of the root: the state, and the position and angle of the value as custom properties. */
export interface KnobRootAttributes extends KnobPartAttributes<'root'> {
  /**
   * While the knob is disabled: the label and the readout belong to an inactive control, whose
   * text WCAG exempts from contrast, and checkers such as axe read that from here.
   */
  readonly 'aria-disabled': true | undefined;
  readonly style: Readonly<KnobRootStyle>;
}

/** Props of the label: an id the control points to while it is mounted. */
export interface KnobLabelAttributes extends KnobPartAttributes<'label'> {
  /** A generated id; pass another one to the element, and the control follows it. */
  readonly id: string;
  readonly ref: RefCallback<HTMLElement>;
}

/**
 * Props of the control: the `svg` of the dial, with the `slider` role, which takes focus and the
 * input (a vertical drag, the wheel, the keys, a double click). Its `style` sets
 * `touch-action: none` and `user-select: none`: a touch drag turns the knob instead of
 * scrolling the page, and a drag or a double click selects no text.
 */
export interface KnobControlAttributes extends KnobPartAttributes<'control'> {
  readonly role: 'slider';
  /** `0`, or none while the knob is disabled: a disabled knob takes no focus. */
  readonly tabIndex: 0 | undefined;
  /** The view box of the geometry, `0 0 100 100`. */
  readonly viewBox: string;
  readonly 'aria-valuemin': number;
  readonly 'aria-valuemax': number;
  readonly 'aria-valuenow': number;
  /** The text of the value: `formatValue(value)`, or the number. */
  readonly 'aria-valuetext': string;
  /** The id of the label, while one is mounted. */
  readonly 'aria-labelledby': string | undefined;
  /** Vertical: a drag up raises the value, and so do ↑ and →. */
  readonly 'aria-orientation': 'vertical';
  readonly 'aria-disabled': true | undefined;
  readonly 'aria-readonly': true | undefined;
  /** Present, empty, while the control has focus and shows a focus ring (a keyboard focus). */
  readonly 'data-focus-visible': '' | undefined;
  readonly style: Readonly<CSSProperties>;
  /** Listens to the wheel, without React: React's `onWheel` cannot keep the page from scrolling. */
  readonly ref: RefCallback<SVGSVGElement>;
  readonly onPointerDown: (event: PointerEvent<SVGSVGElement>) => void;
  readonly onPointerMove: (event: PointerEvent<SVGSVGElement>) => void;
  readonly onPointerUp: (event: PointerEvent<SVGSVGElement>) => void;
  readonly onPointerCancel: (event: PointerEvent<SVGSVGElement>) => void;
  readonly onLostPointerCapture: (event: PointerEvent<SVGSVGElement>) => void;
  readonly onContextMenu: (event: MouseEvent<SVGSVGElement>) => void;
  readonly onDoubleClick: (event: MouseEvent<SVGSVGElement>) => void;
  readonly onKeyDown: (event: KeyboardEvent<SVGSVGElement>) => void;
  readonly onFocus: (event: FocusEvent<SVGSVGElement>) => void;
  readonly onBlur: (event: FocusEvent<SVGSVGElement>) => void;
}

/** What the shapes of the dial draw with: a stroke in `currentColor`, round caps, no fill. */
export interface KnobShapeAttributes {
  readonly strokeWidth: number;
  readonly stroke: 'currentColor';
  readonly strokeLinecap: 'round';
  readonly fill: 'none';
}

/** Props of the track (the whole travel) and the range (from the origin to the value): paths. */
export interface KnobArcAttributes<Part extends 'track' | 'range'>
  extends KnobPartAttributes<Part>, KnobShapeAttributes {
  /** The path data, in the view box of the control; empty for a range at its origin. */
  readonly d: string;
}

/** Props of the thumb: a line that points at the value. */
export interface KnobThumbAttributes extends KnobPartAttributes<'thumb'>, KnobShapeAttributes {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Props of the hidden input: the value of the knob, for its form. */
export interface KnobHiddenInputAttributes extends KnobPartAttributes<'hidden-input'> {
  readonly type: 'hidden';
  readonly name: string | undefined;
  readonly form: string | undefined;
  /** The value, as a string. */
  readonly value: string;
  /** While the knob is disabled: a form leaves its value out, as it does a disabled input's. */
  readonly disabled: boolean;
}

/** What {@link useKnob} returns: the API and the props of each element. */
export interface UseKnobReturn extends knob.Api {
  readonly getRootProps: () => KnobRootAttributes;
  readonly getLabelProps: () => KnobLabelAttributes;
  readonly getControlProps: () => KnobControlAttributes;
  readonly getTrackProps: () => KnobArcAttributes<'track'>;
  readonly getRangeProps: () => KnobArcAttributes<'range'>;
  readonly getThumbProps: () => KnobThumbAttributes;
  readonly getValueTextProps: () => KnobPartAttributes<'value-text'>;
  readonly getHiddenInputProps: () => KnobHiddenInputAttributes;
}

/**
 * The DOM platform of the knob machine: the `setTimeout` clock, for the end of a run of wheel
 * events, and nothing else, since the parts read the input themselves. A module-level constant,
 * since `useMachine` reads it once.
 */
const platform: Platform<knob.Schema> = { schedule, actions: {}, effects: {} };

const present = (flag: boolean): '' | undefined => (flag ? '' : undefined);

/** The inline style of the control: input, not looks, so it stays without a stylesheet. */
const CONTROL_STYLE: Readonly<CSSProperties> = {
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

/** The look of the shapes of the dial, the same for the three of them. */
const shape = (strokeWidth: number): KnobShapeAttributes => ({
  strokeWidth,
  stroke: 'currentColor',
  strokeLinecap: 'round',
  fill: 'none',
});

/** Whether the element shows a focus ring: `:focus-visible`, where the browser knows it. */
function showsFocusRing(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

/**
 * How far a press may travel, in pixels (`|dx| + |dy|` over its moves), and still be half of a
 * double click: past it, the press is a drag. The release of a drag is a click to the browser,
 * which the pointer capture keeps on the control, so a quick click after a drag makes a double
 * click; under the pointer lock the pointer does not even move on screen.
 */
const DRAG_SLOP = 4;

/** A press on the control: how far the pointer travelled while it was down. */
interface Press {
  /** The pixels it moved, `|dx| + |dy|` over its moves. */
  travel: number;
}

/** A drag in progress: the pointer that drags, its press, and where it was. */
interface Drag {
  readonly pointerId: number;
  /** The press of the drag, whose travel its moves add to. */
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

/** Handlers of a pointer lock: it ended before the drag, or the browser refused it. */
interface PointerLockHandlers {
  readonly onLost: () => void;
  readonly onRefused: () => void;
}

/**
 * Lock the pointer to `element` for a drag (`requestPointerLock()`). Returns what gives it back
 * at the end of the drag, also when the browser grants it only after that. The lock ending while
 * the drag goes on (the user pressed Escape) calls `onLost`.
 */
function lockPointer(element: Element, { onLost, onRefused }: PointerLockHandlers): () => void {
  const doc = element.ownerDocument;
  /** Whether the drag still wants the lock. */
  let wanted = true;
  const stop = (): void => {
    doc.removeEventListener('pointerlockchange', onChange);
    doc.removeEventListener('pointerlockerror', onError);
  };
  function onChange(): void {
    if (doc.pointerLockElement === element) {
      // Granted after the drag ended: given back at once.
      if (!wanted) {
        doc.exitPointerLock();
      }
      return;
    }
    // Given back: at the end of the drag, or by the user, which ends the drag too.
    stop();
    if (wanted) {
      wanted = false;
      onLost();
    }
  }
  function onError(): void {
    stop();
    if (wanted) {
      onRefused();
    }
  }
  doc.addEventListener('pointerlockchange', onChange);
  doc.addEventListener('pointerlockerror', onError);
  try {
    // A promise in Chrome, which rejects as `pointerlockerror` fires: that event handles it.
    const request: unknown = element.requestPointerLock();
    if (request instanceof Promise) {
      request.catch(() => undefined);
    }
  } catch {
    // No pointer lock here (iOS): the drag goes on with the pointer capture.
    onError();
  }
  return () => {
    wanted = false;
    if (doc.pointerLockElement === element) {
      doc.exitPointerLock();
    }
  };
}

/**
 * The native `wheel` listener of the control. React's `onWheel` listens passively, so the page
 * would scroll; this one keeps it still while the wheel turns a knob that can turn. The wheel
 * moves only vertically, or sideways under Shift, as macOS sends it then (`getRangeWheelDelta`).
 */
function useWheelRef(
  service: Service<knob.Schema>,
  drag: RefObject<Drag | null>,
): RefCallback<SVGSVGElement> {
  return useCallback<RefCallback<SVGSVGElement>>(
    (element) => {
      if (element === null) {
        return undefined;
      }
      const onWheel = (event: WheelEvent): void => {
        if (service.prop('disabled') || service.prop('readOnly')) {
          return;
        }
        event.preventDefault();
        const deltaY = getRangeWheelDelta(event);
        if (deltaY !== 0) {
          service.send({ type: 'WHEEL', deltaY, fine: event.shiftKey });
        }
      };
      element.addEventListener('wheel', onWheel, { passive: false });
      return () => {
        element.removeEventListener('wheel', onWheel);
        // Unmounted during a drag: the pointer lock goes back.
        drag.current?.release();
      };
    },
    [service, drag],
  );
}

/**
 * Run the knob machine of `@contour-ui/core` in a component, on the DOM: its API (`value`,
 * `valueText`, `position`, `angle`, `geometry`, `setValue()`…) and the props of the root, the
 * label, the control, the track, the range, the thumb, the value text and the hidden input. The
 * control reads the input: a vertical drag of the primary button (up raises the value; Shift
 * slows it down, by ten), the wheel, the keys of a slider (arrows, Shift for fine steps, Page Up
 * and Page Down, Home and End) and a double click, which resets the value. `Knob.Root` calls it;
 * call it yourself to build the parts from your own elements.
 *
 * @example
 * const api = useKnob({ min: -60, max: 12, defaultValue: 0, formatValue: formatDecibels });
 * <div {...api.getRootProps()}>
 *   <span {...api.getLabelProps()}>Gain</span>
 *   <svg {...api.getControlProps()}>
 *     <path {...api.getTrackProps()} />
 *     <path {...api.getRangeProps()} />
 *     <line {...api.getThumbProps()} />
 *   </svg>
 *   <span {...api.getValueTextProps()}>{api.valueText}</span>
 * </div>;
 */
export function useKnob(props: UseKnobProps = {}): UseKnobReturn {
  const { pointerLock = false, name, form, ...input } = props;
  const service = useMachine(knob.machine, input, platform);
  const api = knob.connect(service);

  const baseId = useId();
  const [labelId, setLabelId] = useState<string | undefined>(undefined);
  const labelRef = useCallback<RefCallback<HTMLElement>>((element) => {
    if (element === null) {
      return undefined;
    }
    setLabelId(element.id);
    return () => {
      setLabelId(undefined);
    };
  }, []);

  const drag = useRef<Drag | null>(null);
  // The last two presses that dragged the knob, the latest last: a double click resets it only
  // when neither of them travelled past `DRAG_SLOP`.
  const presses = useRef<readonly Press[]>([]);
  // Whether the control takes focus from a press: it shows no ring then, as after a click.
  const pressFocus = useRef(false);
  const controlRef = useWheelRef(service, drag);

  /** End the drag in progress, if any: the release, a cancel, a lost capture or lock. */
  const finishDrag = (element: Element): void => {
    const current = drag.current;
    if (current === null) {
      return;
    }
    drag.current = null;
    current.release();
    if (element.hasPointerCapture(current.pointerId)) {
      element.releasePointerCapture(current.pointerId);
    }
    api.endDrag();
  };

  const beginDrag = (event: PointerEvent<SVGSVGElement>): void => {
    const element = event.currentTarget;
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // Not an active pointer: the moves over the control still drag.
    }
    const press: Press = { travel: 0 };
    presses.current = [...presses.current.slice(-1), press];
    const current: Drag = {
      pointerId: event.pointerId,
      press,
      x: event.clientX,
      y: event.clientY,
      lock: pointerLock,
      release: () => undefined,
    };
    drag.current = current;
    api.startDrag();
    if (pointerLock) {
      current.release = lockPointer(element, {
        onLost: () => {
          finishDrag(element);
        },
        onRefused: () => {
          current.lock = false;
        },
      });
    }
  };

  const disabled = api.disabled;
  const readOnly = api.readOnly;
  const part = <Part extends string>(partName: Part): KnobPartAttributes<Part> => ({
    'data-scope': 'knob',
    'data-part': partName,
    'data-disabled': present(disabled),
    'data-readonly': present(readOnly),
    'data-dragging': present(api.dragging),
  });
  const { geometry } = api;

  return {
    ...api,
    getRootProps: () => ({
      ...part('root'),
      'aria-disabled': disabled ? true : undefined,
      style: { '--knob-position': String(api.position), '--knob-angle': `${api.angle}deg` },
    }),
    getLabelProps: () => ({
      ...part('label'),
      id: `${baseId}label`,
      ref: labelRef,
    }),
    getControlProps: () => ({
      ...part('control'),
      role: 'slider',
      tabIndex: disabled ? undefined : 0,
      viewBox: geometry.viewBox,
      'aria-valuemin': api.min,
      'aria-valuemax': api.max,
      'aria-valuenow': api.value,
      'aria-valuetext': api.valueText,
      'aria-labelledby': labelId,
      'aria-orientation': 'vertical',
      'aria-disabled': disabled ? true : undefined,
      'aria-readonly': readOnly ? true : undefined,
      'data-focus-visible': present(api.focusVisible),
      style: CONTROL_STYLE,
      ref: controlRef,
      onPointerDown: (event) => {
        // The owner's handler runs first: `event.preventDefault()` there keeps the knob still.
        if (event.defaultPrevented || event.button !== 0 || disabled) {
          return;
        }
        const element = event.currentTarget;
        // The browser focuses the control on a mouse press, with no ring; a touch or a pen that
        // drags at once would not.
        if (event.pointerType !== 'mouse' && element.ownerDocument.activeElement !== element) {
          pressFocus.current = true;
          element.focus({ preventScroll: true });
          pressFocus.current = false;
        }
        if (readOnly) {
          return;
        }
        if (drag.current !== null) {
          // Another finger: the first one drags.
          if (drag.current.pointerId !== event.pointerId) {
            return;
          }
          // The release of the last press went astray: that drag ends first.
          finishDrag(element);
        }
        beginDrag(event);
      },
      onPointerMove: (event) => {
        const current = drag.current;
        if (current === null || current.pointerId !== event.pointerId) {
          return;
        }
        const element = event.currentTarget;
        // Under the pointer lock, the pointer stays where it is and reports its movement.
        const locked = element.ownerDocument.pointerLockElement === element;
        const deltaX = locked ? event.movementX : event.clientX - current.x;
        const deltaY = locked ? event.movementY : event.clientY - current.y;
        current.x = event.clientX;
        current.y = event.clientY;
        // Sideways too: only the vertical movement turns the knob, but any makes the press a drag.
        current.press.travel += Math.abs(deltaX) + Math.abs(deltaY);
        if (deltaY !== 0) {
          api.moveDrag(deltaY, event.shiftKey);
        }
      },
      onPointerUp: (event) => {
        if (drag.current?.pointerId === event.pointerId) {
          finishDrag(event.currentTarget);
        }
      },
      onPointerCancel: (event) => {
        if (drag.current?.pointerId === event.pointerId) {
          finishDrag(event.currentTarget);
        }
      },
      onLostPointerCapture: (event) => {
        const current = drag.current;
        // The pointer lock may take the capture: the drag goes on, and the lock ends it.
        if (current?.pointerId === event.pointerId && !current.lock) {
          finishDrag(event.currentTarget);
        }
      },
      onContextMenu: (event) => {
        // A context menu takes the release (Control and a click on macOS): the drag ends here.
        finishDrag(event.currentTarget);
      },
      onDoubleClick: (event) => {
        // A drag and a quick click after it make a double click too: that one does not reset.
        const still = presses.current.every((press) => press.travel <= DRAG_SLOP);
        if (!event.defaultPrevented && event.button === 0 && still) {
          api.resetValue();
        }
      },
      onKeyDown: (event) => {
        if (event.defaultPrevented) {
          return;
        }
        const intent = getRangeIntent(event);
        if (intent === null) {
          return;
        }
        event.preventDefault();
        // A key after a press shows the ring: the browser's `:focus-visible` follows the keyboard.
        if (api.focused && !api.focusVisible && showsFocusRing(event.currentTarget)) {
          api.focusControl(true);
        }
        const step = event.shiftKey ? 'fine' : 'step';
        switch (intent) {
          case 'increment': {
            api.stepValue(1, step);
            break;
          }
          case 'decrement': {
            api.stepValue(-1, step);
            break;
          }
          case 'increment-page': {
            api.stepValue(1, 'page');
            break;
          }
          case 'decrement-page': {
            api.stepValue(-1, 'page');
            break;
          }
          case 'min':
          case 'max': {
            api.setToEdge(intent);
            break;
          }
        }
      },
      onFocus: (event) => {
        api.focusControl(!pressFocus.current && showsFocusRing(event.currentTarget));
      },
      onBlur: () => {
        api.blurControl();
      },
    }),
    getTrackProps: () => ({
      ...part('track'),
      ...shape(geometry.track.strokeWidth),
      d: geometry.track.d,
    }),
    getRangeProps: () => ({
      ...part('range'),
      ...shape(geometry.range.strokeWidth),
      d: geometry.range.d,
    }),
    getThumbProps: () => {
      const { x1, y1, x2, y2, strokeWidth } = geometry.thumb;
      return { ...part('thumb'), ...shape(strokeWidth), x1, y1, x2, y2 };
    },
    getValueTextProps: () => part('value-text'),
    getHiddenInputProps: () => ({
      ...part('hidden-input'),
      type: 'hidden',
      name,
      form,
      value: String(api.value),
      disabled,
    }),
  };
}
