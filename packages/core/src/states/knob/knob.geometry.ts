import { clampPosition } from '../../scales/index.ts';

/*
 * The dial of a knob as SVG shapes in a 100 × 100 view box, the same on every platform: a track
 * arc over the travel, a range arc from the origin to the value, and a thumb line that points at
 * the value. Strokes are in view-box units, so they scale with the knob as icons do; colors are
 * left to styles.
 */

/** The angles of the ends of the travel, in degrees clockwise from the top: a 270° sweep open at the bottom. */
export const KNOB_START_ANGLE = -135;
export const KNOB_END_ANGLE = 135;

const SIZE = 100;
const CENTER = SIZE / 2;
/** The track and the range: a band from radius 42 to the edge of the view box. */
const TRACK_WIDTH = 8;
const TRACK_RADIUS = CENTER - TRACK_WIDTH / 2;
/** The thumb: a line from near the center towards the track, with a gap before it. */
const THUMB_WIDTH = 6;
const THUMB_INNER_RADIUS = 14;
const THUMB_OUTER_RADIUS = 32;

/** An arc of the dial: SVG path data and its stroke width. `d` is empty for an arc of no length. */
export interface KnobArc {
  readonly d: string;
  readonly strokeWidth: number;
}

/** The thumb: a line from `(x1, y1)` to `(x2, y2)` and its stroke width. */
export interface KnobLine {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly strokeWidth: number;
}

/**
 * The shapes of a knob's dial at a value, in the coordinates of `viewBox`. Draw the arcs and the
 * line with round caps and no fill.
 */
export interface KnobGeometry {
  /** `'0 0 100 100'`. */
  readonly viewBox: string;
  /** The whole travel, from `min` to `max`. */
  readonly track: KnobArc;
  /** From the origin to the value, either way; empty while the value is at the origin. */
  readonly range: KnobArc;
  /** Points at the value. */
  readonly thumb: KnobLine;
}

/**
 * The angle of a position on the travel, in degrees clockwise from the top: −135 at 0, 135 at 1.
 *
 * @example
 * getKnobAngle(0.5); // 0, straight up
 */
export function getKnobAngle(position: number): number {
  return KNOB_START_ANGLE + clampPosition(position) * (KNOB_END_ANGLE - KNOB_START_ANGLE);
}

/** A coordinate rounded to thousandths, without a negative zero, so path data stays short and stable. */
function round(value: number): number {
  const rounded = Math.round(value * 1000) / 1000;
  return rounded === 0 ? 0 : rounded;
}

/** The point at `angle` (degrees clockwise from the top) and `radius` from the center. */
function point(angle: number, radius: number): readonly [number, number] {
  const radians = (angle * Math.PI) / 180;
  return [round(CENTER + radius * Math.sin(radians)), round(CENTER - radius * Math.cos(radians))];
}

/** The path of the track arc between two positions, clockwise; empty when they are the same. */
function arcPath(from: number, to: number): string {
  const start = getKnobAngle(Math.min(from, to));
  const end = getKnobAngle(Math.max(from, to));
  if (end - start < 1e-9) {
    return '';
  }
  const [x1, y1] = point(start, TRACK_RADIUS);
  const [x2, y2] = point(end, TRACK_RADIUS);
  const largeArc = end - start > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${TRACK_RADIUS} ${TRACK_RADIUS} 0 ${largeArc} 1 ${x2} ${y2}`;
}

/**
 * The shapes of the dial for a value at `position`, with the range arc starting at
 * `originPosition` (both from 0 to 1, clamped).
 *
 * @example
 * const { viewBox, track, range, thumb } = getKnobGeometry(0.75, 0);
 * <svg viewBox={viewBox}><path d={range.d} strokeWidth={range.strokeWidth} /></svg>;
 */
export function getKnobGeometry(position: number, originPosition: number): KnobGeometry {
  const angle = getKnobAngle(position);
  const [x1, y1] = point(angle, THUMB_INNER_RADIUS);
  const [x2, y2] = point(angle, THUMB_OUTER_RADIUS);
  return {
    viewBox: `0 0 ${SIZE} ${SIZE}`,
    track: { d: arcPath(0, 1), strokeWidth: TRACK_WIDTH },
    range: {
      d: arcPath(clampPosition(originPosition), clampPosition(position)),
      strokeWidth: TRACK_WIDTH,
    },
    thumb: { x1, y1, x2, y2, strokeWidth: THUMB_WIDTH },
  };
}
