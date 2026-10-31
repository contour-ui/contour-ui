/**
 * WCAG 2 contrast of the color pairs components put on screen, in every theme. The pairs are data
 * of the package (`contrast.json`): a foreground role, the background it sits on and the least
 * ratio. A foreground ending in `.*` stands for every color of that group. A translucent
 * foreground is composited over its background first.
 */
import { formatHex, rgb, wcagContrast } from 'culori';
import type { Rgb } from 'culori';

import { expectRecord, parseColor, toOklch } from '../model/dtcg.ts';
import { valueIn } from '../model/model.ts';
import type { ModelToken, TokenModel } from '../model/model.ts';
import type { Report } from '../model/problem.ts';
import type { TokenCheck } from './check.ts';

interface Pair {
  readonly foreground: string;
  readonly background: string;
  readonly minimum: number;
}

function parsePairs(data: unknown, file: string): Pair[] {
  const pairs = expectRecord(data, file)['pairs'];
  if (!Array.isArray(pairs)) {
    throw new TypeError(
      `${file}: expected "pairs", a list of { foreground, background, minimum }.`,
    );
  }
  return pairs.map((item: unknown, index) => {
    const { foreground, background, minimum } = expectRecord(item, `${file}: pairs[${index}]`);
    if (
      typeof foreground !== 'string' ||
      typeof background !== 'string' ||
      typeof minimum !== 'number'
    ) {
      throw new TypeError(`${file}: pairs[${index}] needs foreground, background and minimum.`);
    }
    return { foreground, background, minimum };
  });
}

/** The tokens a foreground stands for: one id, or every color of a group for `group.*`. */
function foregrounds(model: TokenModel, pattern: string): readonly ModelToken[] {
  if (!pattern.endsWith('.*')) {
    const token = model.token(pattern);
    return token === undefined ? [] : [token];
  }
  const group = pattern.slice(0, -2).split('.');
  return model.tokens.filter(
    (token) =>
      token.type === 'color' &&
      token.path.length === group.length + 1 &&
      group.every((segment, index) => token.path[index] === segment),
  );
}

/** The sRGB color a token is drawn as, 8 bits per channel, and its alpha. */
function drawn(token: ModelToken, theme: string): { readonly color: Rgb; readonly alpha: number } {
  const value = parseColor(valueIn(token, theme).value, token.id);
  const color = rgb(formatHex(toOklch(value, token.id)));
  if (color === undefined) {
    throw new TypeError(`${token.id}: not a color.`);
  }
  return { color, alpha: value.alpha };
}

/** A translucent color over an opaque one. */
const over = (top: Rgb, alpha: number, bottom: Rgb): Rgb => ({
  mode: 'rgb',
  r: top.r * alpha + bottom.r * (1 - alpha),
  g: top.g * alpha + bottom.g * (1 - alpha),
  b: top.b * alpha + bottom.b * (1 - alpha),
});

function measure(
  model: TokenModel,
  pair: Pair,
  foreground: ModelToken,
  theme: string,
  report: Report,
): void {
  const source = 'contrast';
  const background = model.token(pair.background);
  if (background?.type !== 'color') {
    report({ source, message: `${pair.background}: no such color token.` });
    return;
  }
  const back = drawn(background, theme);
  if (back.alpha !== 1) {
    report({ source, token: background.id, theme, message: 'a background must be opaque.' });
    return;
  }
  const front = drawn(foreground, theme);
  const ratio = wcagContrast(over(front.color, front.alpha, back.color), back.color);
  if (ratio < pair.minimum) {
    report({
      source,
      token: foreground.id,
      theme,
      message: `${ratio.toFixed(2)}:1 on ${background.id}, below ${pair.minimum}:1.`,
    });
  }
}

/** `file` holds the pairs, relative to the package. */
export function contrast(file: string): TokenCheck {
  return {
    name: 'contrast',
    run(model, report, context) {
      for (const pair of parsePairs(context.readJson(file), file)) {
        const tokens = foregrounds(model, pair.foreground);
        if (tokens.length === 0 || tokens.some((token) => token.type !== 'color')) {
          report({ source: 'contrast', message: `${pair.foreground}: no such color token.` });
          continue;
        }
        for (const theme of model.themes) {
          for (const token of tokens) {
            measure(model, pair, token, theme, report);
          }
        }
      }
    },
  };
}
