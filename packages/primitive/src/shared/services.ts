/*
 * The contracts of the platform services: the same options and the same meaning on every
 * backend, so a part written once reads its input through them. Each backend implements them
 * with what its platform has and returns props (and a ref) of its own elements, which the part
 * merges into the element the service serves. Parts never read raw events or nodes: the data a
 * service hands over is all a part may rely on.
 */
import type { RangeWheelLike } from '@contour-ui/core';

import type { InteractionState } from './interaction.ts';

/** A move of a drag: the pixels since the previous move (positive right and down), and Shift. */
export interface DragMove {
  readonly deltaX: number;
  readonly deltaY: number;
  readonly shiftKey: boolean;
}

/**
 * Why a drag ended: the press was released (`release`); the platform cancelled it (`cancel`);
 * the element lost the pointer, a lost capture or pointer lock, as when Escape leaves the lock
 * (`lost`); a context menu took the release (`contextmenu`); the element turned disabled
 * (`disabled`).
 */
export type DragEndReason = 'release' | 'cancel' | 'lost' | 'contextmenu' | 'disabled';

/**
 * A drag of the primary button, one pointer at a time, and the double press of the same input:
 * on the web with an explicit pointer capture and client deltas (the movement under a lock); on
 * Soundor, whose press keeps the pointer by itself, with `movementX` and `movementY`.
 *
 * **Double press**, the same gesture on every platform: two presses of the primary button make
 * one when the first travelled no more than 4 px (`|dx| + |dy|` over its moves) and the second
 * comes within the double-click time of the platform (on the web the system's, from the click
 * count of a mouse; `isDoublePress` of `@contour-ui/core` for touch, pen and Soundor). It fires
 * at the second press, which starts no drag: no `onStart`, no `onMove`, no `onEnd`.
 */
export interface DragOptions {
  /** Presses do nothing, and a drag under way ends (`onEnd('disabled')`). */
  readonly disabled: boolean;
  /**
   * Presses start nothing, though they still focus the element where the platform focuses a
   * pressed control: a read-only control.
   */
  readonly readOnly: boolean;
  /**
   * Lock the pointer to the element while it drags (`requestPointerLock()`): the pointer hides,
   * and no edge of the screen stops the drag. A refused lock leaves the drag unlocked.
   */
  readonly pointerLock: boolean;
  /** A press began a drag. */
  readonly onStart: () => void;
  /** The pointer moved during the drag; never with both deltas 0. */
  readonly onMove: (move: DragMove) => void;
  /** The drag ended. Not called when the element unmounts during a drag. */
  readonly onEnd: (reason: DragEndReason) => void;
  /** A double press (see above), at its second press. */
  readonly onDoublePress: () => void;
}

/** A turn of the wheel over the element, as range controls read it (`getRangeWheelDelta`). */
export type WheelTurn = RangeWheelLike;

/**
 * The wheel over the element: a native listener with `{ passive: false }` on the web (React's
 * `onWheel` listens passively and cannot keep the page still), `onWheel` on Soundor. While not
 * `disabled`, the service prevents the default (a scroll) and calls `onWheel`; while `disabled`,
 * the wheel scrolls what is around the element.
 */
export interface WheelOptions {
  readonly disabled: boolean;
  readonly onWheel: (turn: WheelTurn) => void;
}

/**
 * The interaction state of an element with behavior (a part of a component with a machine),
 * tracked on every platform into a store of its own: hover, press and focus (see
 * {@link InteractionState}).
 */
export interface InteractionOptions {
  /**
   * Nothing is tracked while disabled: the state rests (all `false`) from the render that turns
   * it on.
   *
   * @defaultValue false
   */
  readonly disabled?: boolean | undefined;
  /**
   * Whether the pointer over the element counts as a hover. `false` for a read-only control,
   * which has nothing to turn and keeps its look under the pointer.
   *
   * @defaultValue true
   */
  readonly hoverable?: boolean | undefined;
  /**
   * Called on every change of the focus and of whether to show it (`focusVisible`), for a
   * machine that keeps the focus in its state.
   */
  readonly onFocusChange?: ((focused: boolean, focusVisible: boolean) => void) | undefined;
}

/**
 * The actions assistive technology takes on an adjustable element (a slider): `increment`,
 * `decrement` and `setValue` of Soundor's `accessibilityActions`. Nothing on the web, where screen
 * readers send the keys of a slider.
 */
export interface RangeActionsOptions {
  /** No actions are offered: a disabled or a read-only control. */
  readonly disabled: boolean;
  /** One step up (`1`) or down (`-1`). */
  readonly onStep: (direction: 1 | -1) => void;
  /** A value assistive technology set, as a finite number. */
  readonly onSetValue: (value: number) => void;
}

/** The input of `useStyleState`: an element without behavior whose look follows its state. */
export interface StyleStateOptions {
  /**
   * The state rests while disabled, as the pressable's own does.
   *
   * @defaultValue false
   */
  readonly disabled?: boolean | undefined;
}

/**
 * What `useStyleState` returns: the state to style the element by, and the props to spread on
 * it. On the web the state always rests and the props are empty, so the component stays a server
 * component: the look of a hover, a press or a focus comes from CSS (`:hover`, `:focus-visible`).
 * On native platforms the state follows the element through the props.
 */
export interface StyleStateResult<Props extends object> {
  readonly state: InteractionState;
  readonly props: Props;
}
