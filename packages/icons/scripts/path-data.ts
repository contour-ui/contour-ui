/**
 * SVG geometry -> normalized path data.
 *
 * - `shapeToPath` turns an SVG shape element into path data, following the
 *   equivalent paths of the SVG 2 basic shapes.
 * - `normalizePath` uses svgpath to make every command absolute, expand the
 *   shorthand curves (`S`, `T`) and replace arcs with cubic curves, then turns
 *   `H` / `V` into `L`. What is left is `M`, `L`, `C`, `Q` and `Z`, printed as a `d`
 *   string and as numbers for canvas drawing.
 *
 * Coordinates are rounded to 3 decimals (the precision of the sources) and printed
 * with `String()`, so the output is the same on every run.
 */
import svgpath from 'svgpath';

import { PathCommand } from '../src/icon-data.ts';

export type Attributes = Readonly<Record<string, string>>;

export interface NormalizedPath {
  /** Absolute `M`, `L`, `C`, `Q` and `Z` commands. */
  readonly d: string;
  /** The same path as `PathCommand` opcodes, each followed by its coordinates. */
  readonly commands: readonly number[];
}

/** Round to 3 decimals; `-0` becomes `0`. */
export function round(value: number): number {
  const rounded = Number(value.toFixed(3));
  return rounded === 0 ? 0 : rounded;
}

const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/iu;

/** A unitless SVG number (`12`, `-.5`, `1e-3`); anything else (`10px`, `50%`) fails. */
export function parseNumber(value: string, what: string): number {
  if (!NUMBER.test(value)) {
    throw new TypeError(`${what}: expected a unitless number, got "${value}".`);
  }
  return Number(value);
}

// ---------------------------------------------------------------------------
// Shapes -> path data
// ---------------------------------------------------------------------------

/**
 * Attributes each element understands. Anything else (a `transform`, an
 * `opacity`…) fails the build instead of being dropped silently.
 */
const SHAPE_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
  path: ['d'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
  line: ['x1', 'y1', 'x2', 'y2'],
  polyline: ['points'],
  polygon: ['points'],
};

/** From the rightmost point, four clockwise quarter arcs (SVG 2 `circle` / `ellipse`). */
function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  const arc = (x: number, y: number): string => `A${rx} ${ry} 0 0 1 ${x} ${y}`;
  return `M${cx + rx} ${cy}${arc(cx, cy + ry)}${arc(cx - rx, cy)}${arc(cx, cy - ry)}${arc(cx + rx, cy)}Z`;
}

/** A horizontal or vertical side, left out when the corners take all of it. */
const side = (command: 'H' | 'V', from: number, to: number): string =>
  from === to ? '' : `${command}${to}`;

/**
 * Clockwise from the top edge after the first corner, with an elliptical arc per
 * rounded corner (SVG 2 `rect`).
 */
function rectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  rx: number,
  ry: number,
): string {
  const right = x + width;
  const bottom = y + height;
  if (rx === 0 || ry === 0) {
    return `M${x} ${y}H${right}V${bottom}H${x}Z`;
  }
  const arc = (endX: number, endY: number): string => `A${rx} ${ry} 0 0 1 ${endX} ${endY}`;
  return [
    `M${x + rx} ${y}`,
    side('H', x + rx, right - rx),
    arc(right, y + ry),
    side('V', y + ry, bottom - ry),
    arc(right - rx, bottom),
    side('H', right - rx, x + rx),
    arc(x, bottom - ry),
    side('V', bottom - ry, y + ry),
    arc(x + rx, y),
    'Z',
  ].join('');
}

/** `polyline` / `polygon` points: x,y pairs separated by commas and/or whitespace. */
function pointsPath(points: string, close: boolean, what: string): string {
  const values = points
    .trim()
    .split(/[\s,]+/u)
    .map((value) => parseNumber(value, `${what} points`));
  if (values.length < 4 || values.length % 2 !== 0) {
    throw new Error(`${what}: points must be two or more x,y pairs.`);
  }
  const pairs = Array.from({ length: values.length / 2 }, (_, index) =>
    values.slice(2 * index, 2 * index + 2).join(' '),
  );
  return `M${pairs.join('L')}${close ? 'Z' : ''}`;
}

/** Path data for an SVG shape element (`path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon`). */
export function shapeToPath(tag: string, attributes: Attributes, what: string): string {
  const known = SHAPE_ATTRIBUTES[tag];
  if (known === undefined) {
    throw new Error(`${what}: <${tag}> is not supported.`);
  }
  const unknown = Object.keys(attributes).filter((name) => !known.includes(name));
  if (unknown.length > 0) {
    throw new Error(`${what}: unsupported attribute ${unknown.join(', ')} on <${tag}>.`);
  }

  const text = (name: string): string => {
    const value = attributes[name];
    if (value === undefined) {
      throw new Error(`${what}: <${tag}> needs ${name}.`);
    }
    return value;
  };
  const optional = (name: string): number | undefined => {
    const value = attributes[name];
    return value === undefined ? undefined : parseNumber(value, `${what} ${name}`);
  };
  const coordinate = (name: string): number => optional(name) ?? 0;
  const positive = (name: string): number => {
    const value = parseNumber(text(name), `${what} ${name}`);
    if (value <= 0) {
      throw new Error(`${what}: ${name} must be positive (got ${value}).`);
    }
    return value;
  };

  switch (tag) {
    case 'path': {
      return text('d');
    }
    case 'circle': {
      const r = positive('r');
      return ellipsePath(coordinate('cx'), coordinate('cy'), r, r);
    }
    case 'ellipse': {
      return ellipsePath(coordinate('cx'), coordinate('cy'), positive('rx'), positive('ry'));
    }
    case 'rect': {
      const width = positive('width');
      const height = positive('height');
      // A missing rx / ry takes the other's value; both are clamped to half the side.
      const rx = optional('rx');
      const ry = optional('ry');
      if ((rx ?? 0) < 0 || (ry ?? 0) < 0) {
        throw new Error(`${what}: rx and ry must not be negative.`);
      }
      return rectPath(
        coordinate('x'),
        coordinate('y'),
        width,
        height,
        Math.min(rx ?? ry ?? 0, width / 2),
        Math.min(ry ?? rx ?? 0, height / 2),
      );
    }
    case 'line': {
      return `M${coordinate('x1')} ${coordinate('y1')}L${coordinate('x2')} ${coordinate('y2')}`;
    }
    case 'polyline':
    case 'polygon': {
      return pointsPath(text('points'), tag === 'polygon', what);
    }
    default: {
      throw new Error(`${what}: <${tag}> is not supported.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

type Letter = keyof typeof PathCommand;

/** Path data with only absolute `M`, `L`, `C`, `Q` and `Z`, as a string and as numbers. */
export function normalizePath(source: string, what: string): NormalizedPath {
  const path = svgpath(source);
  // svgpath reports syntax errors in an `err` string that its types do not declare.
  if ('err' in path && typeof path.err === 'string' && path.err !== '') {
    throw new Error(`${what}: ${path.err}`);
  }

  let d = '';
  const commands: number[] = [];
  const emit = (letter: Letter, ...coordinates: number[]): void => {
    const rounded = coordinates.map((value) => round(value));
    d += `${letter}${rounded.join(' ')}`;
    commands.push(PathCommand[letter], ...rounded);
  };

  path
    .abs()
    .unshort()
    .unarc()
    .iterate((segment, _index, x, y) => {
      switch (segment[0]) {
        case 'M':
        case 'L': {
          emit(segment[0], segment[1], segment[2]);
          break;
        }
        case 'H': {
          emit('L', segment[1], y);
          break;
        }
        case 'V': {
          emit('L', x, segment[1]);
          break;
        }
        case 'C': {
          const [, x1, y1, x2, y2, endX, endY] = segment;
          emit('C', x1, y1, x2, y2, endX, endY);
          break;
        }
        case 'Q': {
          const [, x1, y1, endX, endY] = segment;
          emit('Q', x1, y1, endX, endY);
          break;
        }
        case 'Z':
        case 'z': {
          emit('Z');
          break;
        }
        // Gone after abs(), unshort() and unarc().
        case 'm':
        case 'l':
        case 'h':
        case 'v':
        case 'c':
        case 'q':
        case 's':
        case 't':
        case 'a':
        case 'S':
        case 'T':
        case 'A': {
          throw new Error(`${what}: "${segment[0]}" is left after normalization.`);
        }
        // Commands svgpath parses but does not type (its non-standard `R`).
        default: {
          throw new Error(`${what}: unsupported path command.`);
        }
      }
    });

  if (!d.startsWith('M')) {
    throw new Error(`${what}: empty path data.`);
  }
  return { d, commands };
}
