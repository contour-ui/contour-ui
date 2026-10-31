/**
 * A palette whose hues share one lightness curve: the same stop (`blue.500`, `red.500`) is as
 * light in every hue, so a contrast pair holds in every hue. Gamut mapping moves lightness a little,
 * so the stops of a step may differ by up to `tolerance` in OKLCH lightness.
 */
import { parseColor, toOklch } from '../model/dtcg.ts';
import { valueIn } from '../model/model.ts';
import type { ModelToken } from '../model/model.ts';
import { attempt } from '../model/problem.ts';
import type { TokenCheck } from './check.ts';

/** `group` holds the hues, such as `base.color`: `base.color.<hue>.<stop>`. */
export function paletteSteps(
  group: string,
  { tolerance = 0.02 }: { readonly tolerance?: number } = {},
): TokenCheck {
  const prefix = group.split('.');
  const source = `paletteSteps(${group})`;
  return {
    name: source,
    run(model, report) {
      const steps = new Map<string, Array<readonly [ModelToken, number]>>();
      for (const token of model.tokens) {
        const inGroup =
          token.type === 'color' &&
          token.path.length === prefix.length + 2 &&
          prefix.every((segment, index) => token.path[index] === segment);
        const stop = token.path.at(-1);
        if (!inGroup || stop === undefined) {
          continue;
        }
        const lightness = attempt(
          report,
          source,
          token,
          model.defaultTheme,
          () => toOklch(parseColor(valueIn(token, model.defaultTheme).value, token.id), token.id).l,
        );
        if (lightness !== undefined) {
          steps.set(stop, [...(steps.get(stop) ?? []), [token, lightness]]);
        }
      }
      for (const [stop, colors] of steps) {
        const lightest = colors.reduce((a, b) => (b[1] > a[1] ? b : a));
        const darkest = colors.reduce((a, b) => (b[1] < a[1] ? b : a));
        if (lightest[1] - darkest[1] > tolerance) {
          report({
            source,
            token: darkest[0].id,
            message: `stop ${stop}: lightness ${darkest[1]}, ${lightest[0].id} ${lightest[1]}; they may differ by ${tolerance}.`,
          });
        }
      }
    },
  };
}
