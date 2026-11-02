import { getRangeIntent, getRangeWheelDelta, isDoublePress, knob } from '@contour-ui/core';
import type { Platform, PressLike } from '@contour-ui/core';
import { useMachine } from '@contour-ui/core/react';
import type { AccessibilityActionInfo } from '@soundor/react';
import { exitPointerLock, pointerLockNode } from 'soundor:ui';
import type {
  AccessibilityActionEvent,
  AccessibilityState,
  AccessibilityValue,
  FocusEvent,
  KeyboardEvent,
  PointerEvent,
  UiNode,
  WheelEvent,
} from 'soundor:ui';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefCallback } from 'react';

/** Props of {@link useKnob}: the input of the knob machine of `@contour-ui/core`, and the pointer lock of a drag. */
export interface UseKnobProps extends knob.Input {
  /**
   * Lock the pointer to the control while it drags the knob (`requestPointerLock()` of
   * `soundor:ui`): the pointer hides, and the drag has no edge of the screen to stop at. It is
   * released with the press, and shows again where the press began.
   *
   * @defaultValue false
   */
  readonly pointerLock?: boolean | undefined;
}

/**
 * Props of the label: its text names the control (`accessibilityLabel`), so assistive technology
 * does not read the label again on its own.
 */
export interface KnobLabelAttributes {
  readonly accessible: false;
  /** Reads the text of the label for the name of the control, while the label is mounted. */
  readonly ref: RefCallback<UiNode>;
}

/**
 * Props of the control: the `Svg` of the dial, an adjustable element to assistive technology,
 * which takes focus and the input (a vertical drag, the wheel, the keys, a double press).
 */
export interface KnobControlAttributes {
  /** Keeps the node, to give up focus while disabled and the pointer lock when unmounted. */
  readonly ref: RefCallback<UiNode>;
  /** The view box of the geometry, `0 0 100 100`. */
  readonly viewBox: string;
  /** Not while the knob is disabled: a disabled knob takes no focus. */
  readonly focusable: boolean;
  readonly accessibilityRole: 'adjustable';
  /**
   * The text of `Knob.Label`, while one is mounted. Without a label, give the control an
   * `accessibilityLabel` of its own, which wins over the label's.
   */
  readonly accessibilityLabel?: string;
  /** The range, the value and its text: `formatValue(value)`, or the number. */
  readonly accessibilityValue: AccessibilityValue;
  readonly accessibilityState: AccessibilityState;
  /** `increment`, `decrement` and `setValue`; none while the knob is disabled or read-only. */
  readonly accessibilityActions: readonly AccessibilityActionInfo[];
  readonly onAccessibilityAction: (event: AccessibilityActionEvent) => void;
  readonly onPointerDown: (event: PointerEvent) => void;
  readonly onPointerMove: (event: PointerEvent) => void;
  readonly onPointerUp: (event: PointerEvent) => void;
  readonly onPointerCancel: (event: PointerEvent) => void;
  /** A context menu takes the release (Control and a click on macOS): the drag ends here. */
  readonly onContextMenu: (event: PointerEvent) => void;
  readonly onPointerEnter: (event: PointerEvent) => void;
  readonly onPointerLeave: (event: PointerEvent) => void;
  readonly onWheel: (event: WheelEvent) => void;
  readonly onKeyDown: (event: KeyboardEvent) => void;
  readonly onFocus: (event: FocusEvent) => void;
  readonly onBlur: (event: FocusEvent) => void;
  readonly onFocusVisibleChange: (event: FocusEvent) => void;
}

/** What the shapes of the dial draw with: a stroke in `currentColor`, round caps, no fill. */
export interface KnobShapeAttributes {
  readonly strokeWidth: number;
  readonly stroke: 'currentColor';
  readonly strokeLinecap: 'round';
  readonly fill: 'none';
}

/** Props of the track (the whole travel) and the range (from the origin to the value): paths. */
export interface KnobArcAttributes extends KnobShapeAttributes {
  /** The path data, in the view box of the control; empty for a range at its origin. */
  readonly d: string;
}

/** Props of the thumb: a line that points at the value. */
export interface KnobThumbAttributes extends KnobShapeAttributes {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/**
 * Props of the value text: the control carries the value and its text
 * (`accessibilityValue`), so assistive technology does not read the readout again on its own.
 */
export interface KnobValueTextAttributes {
  readonly accessible: false;
}

/**
 * What {@link useKnob} returns: the API, whether the pointer is over the control, and the props
 * of the parts. The root has none: Soundor has no data attributes to carry the state on it.
 */
export interface UseKnobReturn extends knob.Api {
  /** The pointer is over the control, and the knob is not disabled: for the styles of a hover. */
  readonly hovered: boolean;
  readonly getLabelProps: () => KnobLabelAttributes;
  readonly getControlProps: () => KnobControlAttributes;
  readonly getTrackProps: () => KnobArcAttributes;
  readonly getRangeProps: () => KnobArcAttributes;
  readonly getThumbProps: () => KnobThumbAttributes;
  readonly getValueTextProps: () => KnobValueTextAttributes;
}

/**
 * The Soundor platform of the knob machine: the runtime's `setTimeout` clock, for the end of a
 * run of wheel events, and nothing else, since the parts read the input themselves. A
 * module-level constant, since `useMachine` reads it once.
 */
const platform: Platform<knob.Schema> = {
  schedule: (ms, fire) => {
    const id = setTimeout(fire, ms);
    return () => {
      clearTimeout(id);
    };
  },
  actions: {},
  effects: {},
};

/** What assistive technology may do to a knob that can turn. */
const ACTIONS: readonly AccessibilityActionInfo[] = [
  { name: 'increment' },
  { name: 'decrement' },
  { name: 'setValue' },
];
const NO_ACTIONS: readonly AccessibilityActionInfo[] = [];

const VALUE_TEXT_PROPS: KnobValueTextAttributes = { accessible: false };

/**
 * How far a press may travel and still be half of a double press: the slop of `isDoublePress`.
 * A press that moved further is a drag, and the next press starts another one.
 */
const CLICK_SLOP = 4;

/** The look of the shapes of the dial, the same for the three of them. */
const shape = (strokeWidth: number): KnobShapeAttributes => ({
  strokeWidth,
  stroke: 'currentColor',
  strokeLinecap: 'round',
  fill: 'none',
});

/** The text of a label node, or `undefined` for none. */
const textOf = (node: UiNode | null): string | undefined =>
  node === null || node.text === '' ? undefined : node.text;

/** The value of a `setValue` action: a number, or a numeric text. */
function numberOf(value: number | string | undefined): number | undefined {
  const next = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof next === 'number' && Number.isFinite(next) ? next : undefined;
}

/** A drag in progress. */
interface Drag {
  /** The pointer that drags. */
  readonly pointerId: number;
  /** The control that took the press, which may hold the pointer lock. */
  readonly node: UiNode | null;
  /** How far the pointer has moved since the press, in pixels on both axes. */
  travel: number;
}

/**
 * Run the knob machine of `@contour-ui/core` in a Soundor component: its API (`value`,
 * `valueText`, `position`, `angle`, `geometry`, `setValue()`…), whether the pointer is over the
 * control, and the props of the label, the control, the track, the range, the thumb and the
 * value text. The control reads the input: a vertical drag of the primary button (up raises the
 * value; Shift slows it down, by ten), from Soundor's `movementY`, locked or not; the wheel; the
 * keys of a slider (arrows, Shift for fine steps, Page Up and Page Down, Home and End); a double
 * press, which resets the value; and the actions of assistive technology. `Knob.Root` calls it;
 * call it yourself to build the parts from your own nodes.
 *
 * @example
 * const api = useKnob({ min: -60, max: 12, defaultValue: 0, formatValue: formatDecibels });
 * <View>
 *   <Text {...api.getLabelProps()}>Gain</Text>
 *   <Svg {...api.getControlProps()} width={40} height={40}>
 *     <Path {...api.getTrackProps()} color="#3d4044" />
 *     <Path {...api.getRangeProps()} color="#51a0ff" />
 *     <Line {...api.getThumbProps()} color="#f2f5fb" />
 *   </Svg>
 *   <Text {...api.getValueTextProps()}>{api.valueText}</Text>
 * </View>;
 */
export function useKnob(props: UseKnobProps = {}): UseKnobReturn {
  const { pointerLock = false, ...input } = props;
  const service = useMachine(knob.machine, input, platform);
  const api = knob.connect(service);
  const { disabled, readOnly, geometry } = api;

  const labelNode = useRef<UiNode | null>(null);
  const [labelText, setLabelText] = useState<string | undefined>(undefined);
  const labelRef = useCallback<RefCallback<UiNode>>((node) => {
    labelNode.current = node;
    setLabelText(textOf(node));
    return () => {
      labelNode.current = null;
      setLabelText(undefined);
    };
  }, []);
  // The text of the label may change in place, without a new node: read it again after every
  // render. Taking the same text renders nothing more, so this settles at once.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- runs after every render on purpose.
  useLayoutEffect(() => {
    setLabelText(textOf(labelNode.current));
  });

  const controlNode = useRef<UiNode | null>(null);
  const controlRef = useCallback<RefCallback<UiNode>>((node) => {
    controlNode.current = node;
    return () => {
      controlNode.current = null;
    };
  }, []);

  const [pointerOver, setPointerOver] = useState(false);
  const drag = useRef<Drag | null>(null);
  /** The last press that may begin a double press. */
  const lastPress = useRef<PressLike | null>(null);

  // Soundor keeps the focus of a node that turns unfocusable: a disabled knob gives it up, as
  // the focus of the web leaves a disabled control.
  useEffect(() => {
    const node = controlNode.current;
    if (disabled && node?.focused === true) {
      node.blur();
    }
  }, [disabled]);

  // Unmounted in the middle of a drag: the pointer lock goes with it.
  useEffect(
    () => () => {
      const node = drag.current?.node;
      if (node !== undefined && node !== null && pointerLockNode() === node) {
        exitPointerLock();
      }
    },
    [],
  );

  /** End the drag in progress, if any: the release, a cancel or a context menu. */
  const finishDrag = (): void => {
    const current = drag.current;
    if (current === null) {
      return;
    }
    drag.current = null;
    // The release gives the lock back by itself; a cancel may not.
    if (current.node !== null && pointerLockNode() === current.node) {
      exitPointerLock();
    }
    api.endDrag();
  };

  return {
    ...api,
    hovered: pointerOver && !disabled,
    getLabelProps: () => ({ accessible: false, ref: labelRef }),
    getControlProps: () => ({
      ref: controlRef,
      viewBox: geometry.viewBox,
      focusable: !disabled,
      accessibilityRole: 'adjustable',
      ...(labelText === undefined ? {} : { accessibilityLabel: labelText }),
      accessibilityValue: { min: api.min, max: api.max, now: api.value, text: api.valueText },
      accessibilityState: { disabled },
      accessibilityActions: disabled || readOnly ? NO_ACTIONS : ACTIONS,
      onAccessibilityAction: (event) => {
        if (event.defaultPrevented || disabled || readOnly) {
          return;
        }
        const { actionName } = event;
        if (actionName === 'increment' || actionName === 'decrement') {
          api.stepValue(actionName === 'increment' ? 1 : -1, 'step');
        } else if (actionName === 'setValue') {
          const next = numberOf(event.value);
          if (next === undefined) {
            return;
          }
          api.commitValue(next);
        } else {
          return;
        }
        // Done: the runtime's own response does not follow.
        event.preventDefault();
      },
      onPointerDown: (event) => {
        // The owner's handler runs first: `event.preventDefault()` there keeps the knob still.
        // A read-only knob takes the focus of the press (the runtime gives it), and nothing else.
        if (event.defaultPrevented || event.button !== 0 || disabled || readOnly) {
          return;
        }
        if (drag.current !== null) {
          // Another finger: the first one drags.
          if (drag.current.pointerId !== event.pointerId) {
            return;
          }
          // The release of the last press went astray: that drag ends first.
          finishDrag();
        }
        const press: PressLike = { time: event.timeStamp, x: event.pageX, y: event.pageY };
        if (isDoublePress(lastPress.current, press)) {
          // The second press of a double press resets the value, and drags nothing.
          lastPress.current = null;
          api.resetValue();
          return;
        }
        lastPress.current = press;
        const node = event.currentTarget;
        drag.current = { pointerId: event.pointerId, node, travel: 0 };
        api.startDrag();
        if (pointerLock && node !== null) {
          node.requestPointerLock().catch(() => {
            // Refused (a touch, or the browser of the web runtime): the press drags unlocked.
          });
        }
      },
      onPointerMove: (event) => {
        const current = drag.current;
        if (current === null || current.pointerId !== event.pointerId) {
          return;
        }
        current.travel += Math.abs(event.movementX) + Math.abs(event.movementY);
        if (current.travel > CLICK_SLOP) {
          // A press that moved is a drag, not the first half of a double press.
          lastPress.current = null;
        }
        // Soundor reports how far the pointer moved, locked or not.
        if (event.movementY !== 0) {
          api.moveDrag(event.movementY, event.shiftKey);
        }
      },
      onPointerUp: (event) => {
        if (drag.current?.pointerId === event.pointerId) {
          finishDrag();
        }
      },
      onPointerCancel: (event) => {
        if (drag.current?.pointerId === event.pointerId) {
          finishDrag();
        }
      },
      onContextMenu: () => {
        // The menu may take the release, and the drag would go on with no button held.
        finishDrag();
      },
      onPointerEnter: () => {
        setPointerOver(true);
      },
      onPointerLeave: () => {
        setPointerOver(false);
      },
      onWheel: (event) => {
        // A knob that cannot turn leaves the wheel to the scroll view around it.
        if (event.defaultPrevented || disabled || readOnly) {
          return;
        }
        // Handled: no scroll view scrolls.
        event.preventDefault();
        // Vertical only; macOS sends it sideways under Shift, which slows it down.
        const deltaY = getRangeWheelDelta(event);
        if (deltaY !== 0) {
          api.scrollWheel(deltaY, event.shiftKey);
        }
      },
      onKeyDown: (event) => {
        if (event.defaultPrevented || disabled) {
          return;
        }
        const intent = getRangeIntent(event);
        if (intent === null) {
          return;
        }
        event.preventDefault();
        const size = event.shiftKey ? 'fine' : 'step';
        switch (intent) {
          case 'increment': {
            api.stepValue(1, size);
            break;
          }
          case 'decrement': {
            api.stepValue(-1, size);
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
        api.focusControl(event.focusVisible);
      },
      onBlur: () => {
        api.blurControl();
      },
      onFocusVisibleChange: (event) => {
        // A key shows the focus a press gave; a blur is followed by one too, which changes nothing.
        if (service.context.get('focused')) {
          api.focusControl(event.focusVisible);
        }
      },
    }),
    getTrackProps: () => ({ ...shape(geometry.track.strokeWidth), d: geometry.track.d }),
    getRangeProps: () => ({ ...shape(geometry.range.strokeWidth), d: geometry.range.d }),
    getThumbProps: () => {
      const { x1, y1, x2, y2, strokeWidth } = geometry.thumb;
      return { ...shape(strokeWidth), x1, y1, x2, y2 };
    },
    getValueTextProps: () => VALUE_TEXT_PROPS,
  };
}
