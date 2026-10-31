/**
 * DTCG 2025.10 helpers shared by the Style Dictionary build, the tests and the
 * design-system export: JSON navigation, value parsing and CSS formatting.
 * Values are parsed from `unknown` and fail loudly on shapes we do not support.
 */
import { readFileSync } from 'node:fs';

export type JsonRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readJson(file: string | URL): unknown {
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  return parsed;
}

export function expectRecord(value: unknown, what: string): JsonRecord {
  if (!isRecord(value)) {
    throw new TypeError(`${what}: expected an object.`);
  }
  return value;
}

/** Child entries of a DTCG group, without `$`-prefixed group properties. */
export function groupEntries(group: unknown, what: string): Array<[string, unknown]> {
  return Object.entries(expectRecord(group, what)).filter(([key]) => !key.startsWith('$'));
}

/** Follow `path` through nested objects. */
export function getPath(root: unknown, path: readonly string[], what: string): unknown {
  let node = root;
  for (const key of path) {
    node = expectRecord(node, `${what} (at "${key}")`)[key];
  }
  return node;
}

/** `{base.space.6}` -> `['base', 'space', '6']`; `undefined` when the value is not a single alias. */
export function aliasPath(value: unknown): string[] | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  return /^\{([^{}]+)\}$/u.exec(value)?.[1]?.split('.');
}

export function tokenValue(token: unknown, what: string): unknown {
  return expectRecord(token, what)['$value'];
}

// ---------------------------------------------------------------------------
// Value parsing
// ---------------------------------------------------------------------------

export type ColorComponent = number | 'none';

export interface ColorValue {
  readonly colorSpace: string;
  readonly components: readonly ColorComponent[];
  readonly alpha: number;
}

export interface UnitValue {
  readonly value: number;
  readonly unit: string;
}

const isComponent = (value: unknown): value is ColorComponent =>
  typeof value === 'number' || value === 'none';

export function parseColor(value: unknown, what: string): ColorValue {
  const color = expectRecord(value, what);
  const { colorSpace, components, alpha } = color;
  if (typeof colorSpace !== 'string' || !Array.isArray(components)) {
    throw new TypeError(`${what}: expected a DTCG color object with colorSpace and components.`);
  }
  const parsed = components.filter((component) => isComponent(component));
  if (parsed.length !== 3 || parsed.length !== components.length) {
    throw new TypeError(`${what}: expected 3 numeric color components.`);
  }
  return {
    colorSpace,
    components: parsed,
    alpha: typeof alpha === 'number' ? alpha : 1,
  };
}

export function parseUnitValue(value: unknown, what: string): UnitValue {
  const record = expectRecord(value, what);
  const { value: amount, unit } = record;
  if (typeof amount !== 'number' || typeof unit !== 'string') {
    throw new TypeError(`${what}: expected { value: number, unit: string }.`);
  }
  return { value: amount, unit };
}

export function parseNumberArray(value: unknown, what: string): number[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'number')) {
    throw new TypeError(`${what}: expected an array of numbers.`);
  }
  return value.filter((item) => typeof item === 'number');
}

export function parseStringArray(value: unknown, what: string): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new TypeError(`${what}: expected a string or an array of strings.`);
  }
  return value.filter((item) => typeof item === 'string');
}

// ---------------------------------------------------------------------------
// CSS formatting
// ---------------------------------------------------------------------------

/** Round to 3 decimals without trailing zeros (`0.0080` -> `0.008`). */
export const round3 = (value: number): number => Number(value.toFixed(3));

const formatComponent = (component: ColorComponent): string =>
  component === 'none' ? 'none' : String(round3(component));

/** DTCG oklch color -> `oklch(L C H)` / `oklch(L C H / a)`. Other color spaces are not used yet. */
export function cssColor(value: unknown, what: string): string {
  const color = parseColor(value, what);
  if (color.colorSpace !== 'oklch') {
    throw new TypeError(`${what}: only oklch colors are supported (got ${color.colorSpace}).`);
  }
  const channels = color.components.map((component) => formatComponent(component)).join(' ');
  return color.alpha === 1 ? `oklch(${channels})` : `oklch(${channels} / ${round3(color.alpha)})`;
}

/** DTCG dimension / duration object -> `6px`, `80ms`. */
export function cssUnitValue(value: unknown, what: string): string {
  if (typeof value === 'string') {
    return value;
  }
  const { value: amount, unit } = parseUnitValue(value, what);
  return `${amount}${unit}`;
}

export function cssCubicBezier(value: unknown, what: string): string {
  return `cubic-bezier(${parseNumberArray(value, what).join(', ')})`;
}

/** Font stack; names containing spaces are quoted. */
export function cssFontFamily(value: unknown, what: string): string {
  return parseStringArray(value, what)
    .map((family) => (family.includes(' ') ? `"${family}"` : family))
    .join(', ');
}

export function cssPlain(value: unknown, what: string): string {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new TypeError(`${what}: expected a number or a string.`);
  }
  return String(value);
}
