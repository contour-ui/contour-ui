/**
 * The Soundor platform: the tokens as Soundor styles take them. Soundor has no CSS, so nothing is
 * a reference: colors are hex (8 digits with an alpha), lengths and durations plain numbers (px,
 * ms), a curve the named easing closest to it, and a text style the style properties of a
 * Soundor `Text`. Shadows have no Soundor equivalent and are left out. A value Soundor cannot take
 * (a color outside sRGB, a length in another unit, a curve without a named easing) is a problem of
 * its token: every token stays expressible in Soundor.
 */
import { displayable, formatHex, formatHex8 } from 'culori';

import {
  aliasPath,
  expectRecord,
  parseColor,
  parseStringArray,
  parseUnitValue,
  round3,
  toOklch,
} from '../model/dtcg.ts';
import { unknownType, valueIn } from '../model/model.ts';
import type { ModelToken } from '../model/model.ts';
import type { PlainValue, ValuesPlatform } from './values.ts';

/** The easing curves Soundor animates with. */
export type SoundorEasing = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface SoundorPlatformOptions {
  /** Soundor has no `cubic-bezier()`: the named easing each curve token becomes, by id. */
  readonly easing: Readonly<Record<string, SoundorEasing>>;
}

const DECLARATIONS = [
  '/** The easing curves Soundor animates with. */',
  "export type SoundorEasing = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';",
  '',
  '/** A text style as the style of a Soundor `Text`: one font family, sizes in px. */',
  'export interface SoundorTextStyle {',
  '  /** The first family of the stack: Soundor takes one. */',
  '  readonly fontFamily: string;',
  '  readonly fontSize: number;',
  '  readonly fontWeight: number;',
  '  /** In px, where CSS takes a multiple of the font size. */',
  '  readonly lineHeight: number;',
  '  readonly letterSpacing: number;',
  '}',
  '',
  '/** A transition as Soundor animates it: durations in ms, the named easing closest to the curve. */',
  'export interface SoundorTransition {',
  '  readonly duration: number;',
  '  readonly easing: SoundorEasing;',
  '  readonly delay: number;',
  '}',
];

const DESCRIPTION = [
  'The semantic tokens with their values for Soundor styles: colors in hex, lengths in px and',
  'durations in ms as numbers. Shadows have no Soundor equivalent and are left out.',
];

/** DTCG oklch color -> `#rrggbb`, or `#rrggbbaa` with an alpha. */
function hexColor(value: unknown, what: string): string {
  const color = parseColor(value, what);
  const oklch = toOklch(color, what);
  if (!displayable(oklch)) {
    throw new RangeError(`${what}: oklch(${oklch.l} ${oklch.c} ${oklch.h}) is outside sRGB.`);
  }
  if (color.alpha < 0 || color.alpha > 1) {
    throw new RangeError(`${what}: alpha ${color.alpha} is not between 0 and 1.`);
  }
  const withAlpha = { ...oklch, alpha: color.alpha };
  return color.alpha === 1 ? formatHex(withAlpha) : formatHex8(withAlpha);
}

/** A length or a duration in the unit Soundor counts in, as a plain number. */
function amount(value: unknown, unit: 'px' | 'ms', what: string): number {
  const parsed = parseUnitValue(value, what);
  if (parsed.unit !== unit) {
    throw new TypeError(`${what}: expected ${unit}, got ${parsed.unit}.`);
  }
  return parsed.value;
}

export function soundorPlatform({ easing }: SoundorPlatformOptions): ValuesPlatform {
  const namedEasing = (curve: string): SoundorEasing => {
    const named = easing[curve];
    if (named === undefined) {
      throw new TypeError(`${curve}: the curve has no named easing.`);
    }
    return named;
  };
  return {
    name: 'soundor',
    declarations: DECLARATIONS,
    description: DESCRIPTION,

    type(token) {
      switch (token.type) {
        case 'color':
        case 'fontFamily': {
          return 'string';
        }
        case 'dimension':
        case 'duration':
        case 'fontWeight':
        case 'number': {
          return 'number';
        }
        case 'cubicBezier': {
          return 'SoundorEasing';
        }
        case 'typography': {
          return 'SoundorTextStyle';
        }
        case 'transition': {
          return 'SoundorTransition';
        }
        case 'shadow': {
          return undefined;
        }
        default: {
          return unknownType(token.type, token.id);
        }
      }
    },

    value(token: ModelToken, theme: string): PlainValue {
      const { value, authored } = valueIn(token, theme);
      const what = token.id;
      switch (token.type) {
        case 'color': {
          return hexColor(value, what);
        }
        case 'dimension': {
          return amount(value, 'px', what);
        }
        case 'duration': {
          return amount(value, 'ms', what);
        }
        case 'fontWeight':
        case 'number': {
          if (typeof value !== 'number') {
            throw new TypeError(`${what}: expected a number.`);
          }
          return value;
        }
        case 'fontFamily': {
          // Soundor takes one family: the first of the stack.
          return parseStringArray(value, what)[0] ?? '';
        }
        case 'cubicBezier': {
          return namedEasing(token.id);
        }
        case 'typography': {
          const parts = expectRecord(value, what);
          const fontSize = amount(parts['fontSize'], 'px', `${what}.fontSize`);
          const { fontWeight, lineHeight } = parts;
          if (typeof fontWeight !== 'number' || typeof lineHeight !== 'number') {
            throw new TypeError(`${what}: expected a numeric fontWeight and lineHeight.`);
          }
          // `fontFamily` takes one family: the first of the stack.
          const [family = ''] = parseStringArray(parts['fontFamily'], `${what}.fontFamily`);
          return {
            fontFamily: family,
            fontSize,
            fontWeight,
            // Soundor counts the line height in px, CSS as a multiple of the font size.
            lineHeight: round3(fontSize * lineHeight),
            letterSpacing: amount(parts['letterSpacing'], 'px', `${what}.letterSpacing`),
          };
        }
        case 'transition': {
          const parts = expectRecord(value, what);
          const curve = aliasPath(expectRecord(authored, what)['timingFunction']);
          if (curve === undefined) {
            throw new TypeError(`${what}: timingFunction must reference a curve token.`);
          }
          return {
            duration: amount(parts['duration'], 'ms', `${what}.duration`),
            easing: namedEasing(curve.join('.')),
            delay: amount(parts['delay'], 'ms', `${what}.delay`),
          };
        }
        case 'shadow': {
          throw new Error(`${what}: Soundor has no shadows.`);
        }
        default: {
          return unknownType(token.type, token.id);
        }
      }
    },
  };
}
