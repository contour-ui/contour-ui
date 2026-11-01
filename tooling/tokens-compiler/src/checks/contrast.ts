/**
 * The contrast pairs of the model, in every theme: each meets its least ratio. Built in, so pairs
 * given to the build are always held; a pair without a minimum is only measured.
 */
import { contrastRatio } from '../model/color.ts';
import { attempt } from '../model/problem.ts';
import type { TokenCheck } from './check.ts';

export function contrast(): TokenCheck {
  return {
    name: 'contrast',
    run(model, report) {
      for (const pair of model.contrast) {
        const { minimum } = pair;
        const foreground = model.token(pair.foreground);
        if (minimum === undefined || foreground === undefined) {
          continue;
        }
        for (const theme of model.themes) {
          const ratio = attempt(report, 'contrast', foreground, theme, () =>
            contrastRatio(model, pair, theme),
          );
          if (ratio !== undefined && ratio < minimum) {
            report({
              source: 'contrast',
              token: pair.foreground,
              theme,
              message: `${ratio.toFixed(2)}:1 on ${pair.background}, below ${minimum}:1.`,
            });
          }
        }
      }
    },
  };
}
