/**
 * Opcodes of {@link IconPath.commands}, one per SVG path command. Each opcode is
 * followed by its arguments, absolute coordinates on the icon grid:
 *
 * - `M x y`: move to;
 * - `L x y`: line to;
 * - `C x1 y1 x2 y2 x y`: cubic Bezier curve;
 * - `Q x1 y1 x y`: quadratic Bezier curve;
 * - `Z`: close the subpath (no arguments).
 */
export const PathCommand = {
  M: 0,
  L: 1,
  C: 2,
  Q: 3,
  Z: 4,
} as const;

/** One path of an icon. */
export interface IconPath {
  /** Path data for SVG `<path d>`: absolute `M`, `L`, `C`, `Q` and `Z` commands only. */
  readonly d: string;
  /**
   * The same path as numbers, for canvas drawing without parsing a string: a
   * {@link PathCommand} opcode followed by its coordinates, then the next one.
   */
  readonly commands: readonly number[];
  /** `true`: filled with the icon color, not stroked (logos). `false`: stroked outline. */
  readonly fill: boolean;
}

/** An icon as renderer-independent data: SVG paths and canvas commands on a 24 x 24 grid. */
export interface IconData {
  /** Source name: the Lucide icon name or the Simple Icons slug (`chevron-right`, `github`). */
  readonly name: string;
  /** Grid size: coordinates are on a `0 0 24 24` viewBox. */
  readonly size: 24;
  /** Stroke width on the grid for the stroked paths (Lucide: `2`); `0` when every path is filled. */
  readonly strokeWidth: number;
  /** Paths in drawing order. */
  readonly paths: readonly IconPath[];
}
