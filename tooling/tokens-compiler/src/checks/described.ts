/**
 * Every token of the given tiers has a `$description`: what the role is for travels with it, into
 * the JSDoc of the typed entries and into `docs.json`.
 */
import type { Tier } from '../model/model.ts';
import type { TokenCheck } from './check.ts';

export function described(tiers: readonly Tier[]): TokenCheck {
  const source = `described(${tiers.join(', ')})`;
  return {
    name: source,
    run(model, report) {
      for (const token of model.tokens) {
        if (tiers.includes(token.tier) && (token.description ?? '').trim() === '') {
          report({ source, token: token.id, message: 'has no $description.' });
        }
      }
    },
  };
}
