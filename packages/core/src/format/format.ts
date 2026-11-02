/*
 * Value readouts without `Intl`, which Hermes (the Soundor runtime) lacks: fixed decimals with
 * `toFixed`, which ignores the locale, a minus sign (U+2212) in place of the hyphen, and units
 * after a space. The text keeps to characters the Latin subset of the token fonts has (`inf` in
 * place of `∞`), since Soundor draws with the Latin TTF faces.
 */

/** The minus sign, as type sets negative numbers. */
const MINUS = '−';

/** Options of {@link formatNumber}. */
export interface FormatNumberOptions {
  /**
   * Digits after the decimal point, rounded half away from zero as `toFixed` does.
   *
   * @defaultValue 0
   */
  readonly decimals?: number | undefined;
  /**
   * Write a plus sign before a number above zero, as gains and pans do. Zero has no sign.
   *
   * @defaultValue false
   */
  readonly signed?: boolean | undefined;
}

/**
 * A number with fixed decimals and a real minus sign. A number that rounds to zero is `0` (or
 * `0.0`…), without a sign; infinities are `inf` and `−inf`.
 *
 * @example
 * formatNumber(-3.456, { decimals: 1 }); // '−3.5'
 * formatNumber(2, { signed: true }); // '+2'
 */
export function formatNumber(
  value: number,
  { decimals = 0, signed = false }: FormatNumberOptions = {},
): string {
  if (Number.isNaN(value)) {
    return 'NaN';
  }
  if (!Number.isFinite(value)) {
    return value > 0 ? `${signed ? '+' : ''}inf` : `${MINUS}inf`;
  }
  const digits = Math.min(20, Math.max(0, Math.trunc(decimals)));
  const text = Math.abs(value).toFixed(digits);
  // `toFixed` keeps the sign of a number that rounds to zero (`-0.04` → `-0.0`): drop it.
  if (Number(text) === 0) {
    return text;
  }
  if (value < 0) {
    return `${MINUS}${text}`;
  }
  return signed ? `+${text}` : text;
}

/** The decimals that show `significant` digits of `value`, counted again once it is rounded. */
function significantDecimals(value: number, significant: number): number {
  const magnitude = Math.abs(value);
  if (magnitude === 0 || !Number.isFinite(magnitude)) {
    return 0;
  }
  const decimals = Math.max(0, significant - 1 - Math.floor(Math.log10(magnitude)));
  // 9.996 at three digits rounds to 10.00, four of them: one decimal fewer gives 10.0.
  const rounded = Math.abs(Number(magnitude.toFixed(decimals)));
  const after = Math.max(0, significant - 1 - Math.floor(Math.log10(rounded)));
  return Math.min(decimals, after);
}

/** Options of the readouts that keep a number of significant digits. */
export interface FormatSignificantOptions {
  /**
   * Significant digits: `440 Hz`, `1.25 kHz`, `12.5 ms` at 3. Whole numbers keep every digit
   * (`20000` is never `2.00e4`), so a readout above `10 ** digits` has more.
   *
   * @defaultValue 3
   */
  readonly digits?: number | undefined;
}

/** A value in a unit and in a thousand of it, where it reaches a thousand. */
function formatScaled(value: number, unit: string, thousandUnit: string, digits: number): string {
  if (!Number.isFinite(value)) {
    return `${formatNumber(value)} ${unit}`;
  }
  const decimals = significantDecimals(value, digits);
  // Rounded first, so 999.6 Hz reads as 1.00 kHz and not as 1000 Hz.
  if (Math.abs(Number(value.toFixed(decimals))) >= 1000) {
    const scaled = value / 1000;
    return `${formatNumber(scaled, { decimals: significantDecimals(scaled, digits) })} ${thousandUnit}`;
  }
  return `${formatNumber(value, { decimals })} ${unit}`;
}

/**
 * A frequency in hertz: `Hz` below a thousand, `kHz` from there, with three significant digits.
 *
 * @example
 * formatFrequency(440); // '440 Hz'
 * formatFrequency(1250); // '1.25 kHz'
 * formatFrequency(12_500); // '12.5 kHz'
 */
export function formatFrequency(hz: number, { digits = 3 }: FormatSignificantOptions = {}): string {
  return formatScaled(hz, 'Hz', 'kHz', digits);
}

/**
 * A duration in milliseconds: `ms` below a second, `s` from there, with three significant digits.
 *
 * @example
 * formatDuration(12.5); // '12.5 ms'
 * formatDuration(1200); // '1.20 s'
 */
export function formatDuration(ms: number, { digits = 3 }: FormatSignificantOptions = {}): string {
  return formatScaled(ms, 'ms', 's', digits);
}

/** Options of {@link formatDecibels}. */
export interface FormatDecibelsOptions extends FormatNumberOptions {
  /**
   * Digits after the decimal point.
   *
   * @defaultValue 1
   */
  readonly decimals?: number | undefined;
}

/**
 * A level in decibels, with one decimal; silence (`-Infinity`) is `−inf dB`.
 *
 * @example
 * formatDecibels(-6); // '−6.0 dB'
 * formatDecibels(3, { signed: true }); // '+3.0 dB'
 * formatDecibels(-Infinity); // '−inf dB'
 */
export function formatDecibels(
  db: number,
  { decimals = 1, signed = false }: FormatDecibelsOptions = {},
): string {
  return `${formatNumber(db, { decimals, signed })} dB`;
}

/**
 * A fraction as a percentage: 0.5 is `50%`.
 *
 * @example
 * formatPercent(0.5); // '50%'
 * formatPercent(0.125, { decimals: 1 }); // '12.5%'
 */
export function formatPercent(fraction: number, options: FormatNumberOptions = {}): string {
  return `${formatNumber(fraction * 100, options)}%`;
}

/**
 * The digits after the decimal point of a step, so values on it read without noise: `0.01`
 * has 2, `0.5` has 1, `5` has none. Steps written with an exponent count too (`1e-7` has 7).
 *
 * @example
 * formatNumber(0.30000000000000004, { decimals: decimalsOf(0.1) }); // '0.3'
 */
export function decimalsOf(step: number): number {
  if (!Number.isFinite(step)) {
    return 0;
  }
  const [mantissa = '', exponent = '0'] = String(Math.abs(step)).split('e');
  const fraction = mantissa.split('.')[1] ?? '';
  return Math.max(0, fraction.length - Number(exponent));
}
