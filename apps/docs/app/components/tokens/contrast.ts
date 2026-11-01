/**
 * How the Tokens page reads a WCAG 2 contrast ratio. The ratios themselves come from `docs.json`:
 * the token build measures the pairs of `packages/tokens/contrast.json` and fails when one misses
 * its target.
 */

/** A ratio as WCAG reads it, `4.5:1`, cut (never rounded up) to one decimal. */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 10) / 10).toFixed(1)}:1`;
}

/** What text in a ratio passes: AAA from 7:1, AA from 4.5:1, AA for large text only from 3:1. */
export function contrastLevel(ratio: number): string {
  if (ratio >= 7) {
    return 'AAA';
  }
  if (ratio >= 4.5) {
    return 'AA';
  }
  return ratio >= 3 ? 'AA large text' : 'fails';
}
