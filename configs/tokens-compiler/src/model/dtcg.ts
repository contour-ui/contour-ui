/**
 * DTCG 2025.10 values: parsed from `unknown`, failing loudly on shapes the compiler does not
 * support. Shared by every layer that reads values.
 */
import type { Oklch } from 'culori';

export type JsonRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function expectRecord(value: unknown, what: string): JsonRecord {
  if (!isRecord(value)) {
    throw new TypeError(`${what}: expected an object.`);
  }
  return value;
}

/** `{base.space.6}` -> `['base', 'space', '6']`; `undefined` when the value is not a single alias. */
export function aliasPath(value: unknown): string[] | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  return /^\{([^{}]+)\}$/u.exec(value)?.[1]?.split('.');
}

/** Every alias in a value, at the top or inside a composite or a list. */
export function aliasesIn(value: unknown): string[][] {
  const alias = aliasPath(value);
  if (alias !== undefined) {
    return [alias];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item: unknown) => aliasesIn(item));
  }
  return isRecord(value) ? Object.values(value).flatMap((item) => aliasesIn(item)) : [];
}

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
  return { colorSpace, components: parsed, alpha: typeof alpha === 'number' ? alpha : 1 };
}

/** An oklch color for culori, alpha left out; `none` behaves as 0 when a color is converted. */
export function toOklch(color: ColorValue, what: string): Oklch {
  if (color.colorSpace !== 'oklch') {
    throw new TypeError(`${what}: only oklch colors are supported (got ${color.colorSpace}).`);
  }
  const [l = 0, c = 0, h = 0] = color.components.map((component) =>
    component === 'none' ? 0 : component,
  );
  return { mode: 'oklch', l, c, h };
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

/** Round to 3 decimals without trailing zeros (`0.0080` -> `0.008`). */
export const round3 = (value: number): number => Number(value.toFixed(3));
