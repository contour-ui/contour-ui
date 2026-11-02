/**
 * What {@link getWheelDelta} reads from a wheel event. A DOM `WheelEvent`, React's and a
 * Soundor one all have these fields.
 */
export interface WheelLike {
  readonly deltaX: number;
  readonly deltaY: number;
  /** The unit of the deltas: 0 pixels, 1 lines, 2 pages. */
  readonly deltaMode: number;
}

/** How far a wheel event scrolls, in pixels: `y` is positive downwards, `x` to the right. */
export interface WheelDelta {
  readonly x: number;
  readonly y: number;
}

/** The pixels of a line and of a page of wheel deltas given in those units, as browsers count them. */
const LINE_PIXELS = 16;
const PAGE_PIXELS = 800;

/**
 * The distance of a wheel event in pixels, whatever unit it came in: Firefox reports lines,
 * some mice pages. A notch of a common mouse wheel is about 100 pixels.
 *
 * @example
 * getWheelDelta({ deltaX: 0, deltaY: 3, deltaMode: 1 }); // { x: 0, y: 48 }
 */
export function getWheelDelta(event: WheelLike): WheelDelta {
  const unit = event.deltaMode === 1 ? LINE_PIXELS : event.deltaMode === 2 ? PAGE_PIXELS : 1;
  return { x: event.deltaX * unit, y: event.deltaY * unit };
}

/** What {@link getRangeWheelDelta} reads: a wheel event and whether Shift is held. */
export interface RangeWheelLike extends WheelLike {
  readonly shiftKey: boolean;
}

/**
 * How far a wheel event turns a range control (a knob, a fader), in pixels, positive downwards:
 * the vertical distance, or the horizontal one while Shift is held and the event has no vertical
 * distance. macOS sends a vertical wheel sideways under Shift, which range controls use for fine
 * moves, so without this Shift would stop the wheel there.
 *
 * @example
 * getRangeWheelDelta({ deltaX: 40, deltaY: 0, deltaMode: 0, shiftKey: true }); // 40
 */
export function getRangeWheelDelta(event: RangeWheelLike): number {
  const { x, y } = getWheelDelta(event);
  return event.shiftKey && y === 0 ? x : y;
}
