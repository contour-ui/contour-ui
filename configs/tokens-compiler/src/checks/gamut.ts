/**
 * Every color inside a gamut, in every theme: color tokens and the colors inside composites (shadow
 * layers). Inside sRGB, a color converts to hex without clipping, so every platform draws the
 * color the token names.
 */
import { displayable } from 'culori';

import { isRecord, parseColor, toOklch } from '../model/dtcg.ts';
import { valueIn } from '../model/model.ts';
import { attempt } from '../model/problem.ts';
import type { TokenCheck } from './check.ts';

/** Every DTCG color object in a value, with where it is. */
function colorsIn(value: unknown, where: string): Array<readonly [string, unknown]> {
  if (Array.isArray(value)) {
    return value.flatMap((item: unknown, index) => colorsIn(item, `${where}[${index}]`));
  }
  if (!isRecord(value)) {
    return [];
  }
  if ('colorSpace' in value) {
    return [[where, value]];
  }
  return Object.entries(value).flatMap(([key, item]) => colorsIn(item, `${where}.${key}`));
}

export function gamut(space: 'srgb'): TokenCheck {
  return {
    name: `gamut(${space})`,
    run(model, report) {
      for (const token of model.tokens) {
        for (const theme of model.themes) {
          attempt(report, `gamut(${space})`, token, theme, () => {
            for (const [where, value] of colorsIn(valueIn(token, theme).value, token.id)) {
              const color = toOklch(parseColor(value, where), where);
              if (!displayable(color)) {
                throw new RangeError(
                  `${where}: oklch(${color.l} ${color.c} ${color.h}) is outside sRGB.`,
                );
              }
            }
          });
        }
      }
    },
  };
}
