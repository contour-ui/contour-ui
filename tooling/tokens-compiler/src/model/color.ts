/**
 * Colors as screens draw them: the sRGB color of a DTCG color, 8 bits per channel, and the WCAG 2
 * contrast of a pair. The contrast check and the token data share it, so the data shows the ratios
 * the build holds.
 */
import { formatHex, rgb, wcagContrast } from 'culori';
import type { Rgb } from 'culori';

import { parseColor, toOklch } from './dtcg.ts';
import { valueIn } from './model.ts';
import type { ContrastPair, TokenModel } from './model.ts';

/** `#rrggbb`: the sRGB color an oklch color is drawn as, its alpha left out. */
export function hexOf(value: unknown, what: string): string {
  return formatHex(toOklch(parseColor(value, what), what));
}

/** The sRGB color of a color token in a theme, 8 bits per channel, and its alpha. */
function drawn(
  model: TokenModel,
  id: string,
  theme: string,
): { readonly color: Rgb; readonly alpha: number } {
  const token = model.token(id);
  if (token?.type !== 'color') {
    throw new TypeError(`${id}: no such color token.`);
  }
  const value = valueIn(token, theme).value;
  const color = rgb(hexOf(value, id));
  if (color === undefined) {
    throw new TypeError(`${id}: not a color.`);
  }
  return { color, alpha: parseColor(value, id).alpha };
}

/** A translucent color over an opaque one. */
const over = (top: Rgb, alpha: number, bottom: Rgb): Rgb => ({
  mode: 'rgb',
  r: top.r * alpha + bottom.r * (1 - alpha),
  g: top.g * alpha + bottom.g * (1 - alpha),
  b: top.b * alpha + bottom.b * (1 - alpha),
});

/**
 * The WCAG 2 contrast ratio of a pair in a theme, from 1 to 21. A translucent foreground is
 * composited over its background first; a background must be opaque.
 */
export function contrastRatio(model: TokenModel, pair: ContrastPair, theme: string): number {
  const back = drawn(model, pair.background, theme);
  if (back.alpha !== 1) {
    throw new RangeError(`${pair.background}: a background must be opaque.`);
  }
  const front = drawn(model, pair.foreground, theme);
  return wcagContrast(over(front.color, front.alpha, back.color), back.color);
}
