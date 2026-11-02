import type { ScaleOption } from '../../scales/index.ts';
import type { KnobGeometry } from './knob.geometry.ts';

/** What `onValueChange`, `onValueChangeStart` and `onValueChangeEnd` receive. */
export interface KnobValueChangeDetails {
  readonly value: number;
}

/** What the owner of a knob passes. Every prop is optional. */
export interface KnobInput {
  /**
   * The value, controlled by the owner. While it is defined, the user's changes are only
   * reported through `onValueChange`; the value changes when the owner passes it back.
   */
  readonly value?: number | undefined;
  /**
   * The value of a knob that keeps its own, read once on creation, and the value a reset (a
   * double click) returns to, controlled or not: a plugin parameter's default. Without it, both
   * are `origin`.
   */
  readonly defaultValue?: number | undefined;
  /** Called with every new value, controlled or not. Not called for the current value. */
  readonly onValueChange?: ((details: KnobValueChangeDetails) => void) | undefined;
  /**
   * Called when the user starts a change: a drag, a run of wheel events, a key, a reset. With the
   * value before it. Every start has its end (`onValueChangeEnd`), so a plugin can record the
   * changes between them as one gesture (`beginGesture()` and `endGesture()` of a parameter).
   */
  readonly onValueChangeStart?: ((details: KnobValueChangeDetails) => void) | undefined;
  /**
   * Called when the change the user started ends: the drag ends, the wheel rests, the key is
   * handled. With the value it left.
   */
  readonly onValueChangeEnd?: ((details: KnobValueChangeDetails) => void) | undefined;
  /**
   * The lowest value.
   *
   * @defaultValue 0
   */
  readonly min?: number | undefined;
  /**
   * The highest value, not below `min`.
   *
   * @defaultValue 100
   */
  readonly max?: number | undefined;
  /**
   * The values the knob stops at: multiples of `step` from `min`, and `max`. Without it, the
   * value is continuous. Keys move a hundredth of the travel either way, and at least one step.
   */
  readonly step?: number | undefined;
  /**
   * How the range spreads over the travel: `'linear'`, `'log'` (frequencies, times; the range
   * must be above zero) or a `Scale` of your own.
   *
   * @defaultValue 'linear'
   */
  readonly scale?: ScaleOption | undefined;
  /**
   * Where the range arc starts: `min` for most knobs, the middle of the range for a bipolar one
   * (pan, a gain from −12 dB to +12 dB at 0).
   *
   * @defaultValue min
   */
  readonly origin?: number | undefined;
  /**
   * Whether the knob is disabled: it ignores the user and takes no focus. A change in progress
   * ends.
   *
   * @defaultValue false
   */
  readonly disabled?: boolean | undefined;
  /**
   * Whether the value is shown but not changed by the user: the knob still takes focus. A change
   * in progress ends. `setValue` still changes it.
   *
   * @defaultValue false
   */
  readonly readOnly?: boolean | undefined;
  /**
   * The text of a value, for the readout and assistive technology: `formatFrequency`,
   * `formatDecibels`… Without it, the number with the decimals of `step` (or of the range).
   */
  readonly formatValue?: ((value: number) => string) | undefined;
  /**
   * How far a vertical drag goes from one end of the travel to the other, in pixels. Shift
   * makes it ten times as far.
   *
   * @defaultValue 200
   */
  readonly dragDistance?: number | undefined;
}

/** What the machine reads through `prop()`: the input with its defaults filled in. */
export interface KnobProps extends KnobInput {
  readonly min: number;
  readonly max: number;
  readonly scale: ScaleOption;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly dragDistance: number;
}

/**
 * The states of a knob: `idle`, `dragging` from a press to its release, and `scrolling` from a
 * wheel event until the wheel has rested for a moment.
 */
export type KnobState = 'idle' | 'dragging' | 'scrolling';

/** How far a step goes: a thousandth (`fine`), a hundredth (`step`) or a tenth (`page`) of the travel. */
export type KnobStepSize = 'fine' | 'step' | 'page';

/**
 * The events of the knob machine. The user's changes (drags, the wheel, steps, edges, resets,
 * commits) are ignored while the knob is disabled or read-only.
 *
 * - `DRAG.START`, `DRAG.MOVE`, `DRAG.END`: a press, the moves of the pointer (`deltaY` in pixels
 *   since the previous move, positive downwards; `fine` while Shift is held) and its release.
 * - `WHEEL`: a wheel event (`deltaY` in pixels, positive downwards).
 * - `VALUE.STEP`: a key steps up (`direction: 1`) or down.
 * - `VALUE.EDGE`: a key goes to `min` or `max`.
 * - `VALUE.RESET`: back to `defaultValue` (a double click).
 * - `VALUE.COMMIT`: the user gives a value in one go (assistive technology).
 * - `VALUE.SET`: change the value from code, whatever `disabled` and `readOnly` say.
 * - `FOCUS`, `BLUR`: the control takes focus (`focusVisible` for a keyboard focus) or loses it.
 * - `GESTURE.CANCEL`: end a change in progress; the machine sends it itself when the knob turns
 *   disabled or read-only.
 */
export type KnobEvent =
  | { readonly type: 'DRAG.START' }
  | { readonly type: 'DRAG.MOVE'; readonly deltaY: number; readonly fine: boolean }
  | { readonly type: 'DRAG.END' }
  | { readonly type: 'WHEEL'; readonly deltaY: number; readonly fine: boolean }
  | { readonly type: 'VALUE.STEP'; readonly direction: 1 | -1; readonly size: KnobStepSize }
  | { readonly type: 'VALUE.EDGE'; readonly edge: 'min' | 'max' }
  | { readonly type: 'VALUE.RESET' }
  | { readonly type: 'VALUE.COMMIT'; readonly value: number }
  | { readonly type: 'VALUE.SET'; readonly value: number }
  | { readonly type: 'FOCUS'; readonly focusVisible: boolean }
  | { readonly type: 'BLUR' }
  | { readonly type: 'GESTURE.CANCEL' };

/** The types the knob machine is made of (see `MachineSchema`). */
export interface KnobSchema {
  input: KnobInput;
  props: KnobProps;
  context: {
    /** The value: controlled by the `value` prop, or owned by the machine. */
    value: number;
    /** Whether the control has focus. */
    focused: boolean;
    /** Whether the focused control shows a focus ring. */
    focusVisible: boolean;
    /**
     * Where a drag or a run of wheel events has brought the knob, before the value snaps to
     * `step`: small moves add up, and a step is taken once they reach it.
     */
    gesturePosition: number;
    /** The last value the change in progress gave, which its end reports, controlled or not. */
    gestureValue: number;
  };
  state: KnobState;
  event: KnobEvent;
  action:
    | 'beginGesture'
    | 'endGesture'
    | 'cancelGesture'
    | 'drag'
    | 'wheel'
    | 'step'
    | 'edge'
    | 'reset'
    | 'commit'
    | 'setValue'
    | 'focus'
    | 'blur';
  guard: 'canAdjust';
  delay: 'wheelIdle';
  platformAction: never;
  platformEffect: never;
}

/** The state and actions of a knob, as `connect` returns them: no DOM, no platform. */
export interface KnobApi {
  readonly value: number;
  /** The text of the value: `formatValue(value)`, or the number. */
  readonly valueText: string;
  readonly min: number;
  readonly max: number;
  /** The step, or `undefined` for a continuous knob. */
  readonly step: number | undefined;
  /** Where the range arc starts, within `[min, max]`. */
  readonly origin: number;
  /** The position of the value on the travel, from 0 at `min` to 1 at `max`, by the scale. */
  readonly position: number;
  /** The position of `origin`. */
  readonly originPosition: number;
  /**
   * The angle of the value, in degrees clockwise from the top: −135 at `min`, 135 at `max`, for
   * a dial of one's own (`rotate()` takes it as it is).
   */
  readonly angle: number;
  /** The shapes of the dial, for the value: the track, the range and the thumb. */
  readonly geometry: KnobGeometry;
  /** Whether the user is dragging the knob. */
  readonly dragging: boolean;
  readonly focused: boolean;
  /** Whether the control has focus and shows a focus ring (a keyboard focus). */
  readonly focusVisible: boolean;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  /**
   * Change the value from code, whatever `disabled` and `readOnly` say: clamped to the range and
   * snapped to `step`. It is reported through `onValueChange`, without a start and an end.
   */
  readonly setValue: (value: number) => void;
  /** A press on the control starts a drag. */
  readonly startDrag: () => void;
  /** The pointer moved by `deltaY` pixels (downwards positive) during a drag; `fine` while Shift is held. */
  readonly moveDrag: (deltaY: number, fine: boolean) => void;
  /** The press ended, or was cancelled. */
  readonly endDrag: () => void;
  /** A wheel event over the control, `deltaY` in pixels (`getWheelDelta`); `fine` while Shift is held. */
  readonly scrollWheel: (deltaY: number, fine: boolean) => void;
  /** Step up (`1`) or down (`-1`) by a thousandth, a hundredth or a tenth of the travel. */
  readonly stepValue: (direction: 1 | -1, size: KnobStepSize) => void;
  /** Go to `min` or `max`. */
  readonly setToEdge: (edge: 'min' | 'max') => void;
  /** Return to `defaultValue` (or `origin`), as a double click does. */
  readonly resetValue: () => void;
  /** Take a value the user gave in one go (assistive technology), with a start and an end. */
  readonly commitValue: (value: number) => void;
  /** Tell the machine the control took focus. */
  readonly focusControl: (focusVisible: boolean) => void;
  /** Tell the machine the control lost focus. */
  readonly blurControl: () => void;
}
