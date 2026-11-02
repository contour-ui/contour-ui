/** A press of a pointer: when it went down and where. */
export interface PressLike {
  /** Milliseconds on any clock, the same for every press compared. */
  readonly time: number;
  /** Where the pointer went down, in pixels. */
  readonly x: number;
  readonly y: number;
}

/** What makes two presses a double press. */
export interface DoublePressOptions {
  /**
   * The longest time from the first press to the second, in milliseconds.
   *
   * @defaultValue 500
   */
  readonly interval?: number | undefined;
  /**
   * How far the second press may land from the first, in pixels on each axis.
   *
   * @defaultValue 4
   */
  readonly slop?: number | undefined;
}

/**
 * Whether a press and the one before it make a double press (a double click): close in time and
 * in place. For platforms without a `dblclick` event of their own, such as Soundor; the DOM has
 * one, which follows the system's settings.
 *
 * @example
 * isDoublePress({ time: 0, x: 10, y: 10 }, { time: 300, x: 11, y: 10 }); // true
 */
export function isDoublePress(
  previous: PressLike | null,
  next: PressLike,
  { interval = 500, slop = 4 }: DoublePressOptions = {},
): boolean {
  return (
    previous !== null &&
    next.time - previous.time <= interval &&
    next.time >= previous.time &&
    Math.abs(next.x - previous.x) <= slop &&
    Math.abs(next.y - previous.y) <= slop
  );
}
