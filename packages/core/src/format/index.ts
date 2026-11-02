/*
 * Value readouts (numbers, Hz, dB, %, ms) without `Intl`, which the Soundor runtime lacks.
 */
export {
  decimalsOf,
  formatDecibels,
  formatDuration,
  formatFrequency,
  formatNumber,
  formatPercent,
} from './format.ts';
export type {
  FormatDecibelsOptions,
  FormatNumberOptions,
  FormatSignificantOptions,
} from './format.ts';
