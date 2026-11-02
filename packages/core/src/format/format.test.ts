import { describe, expect, it } from 'vite-plus/test';

import {
  decimalsOf,
  formatDecibels,
  formatDuration,
  formatFrequency,
  formatNumber,
  formatPercent,
} from './format.ts';

const MINUS = '−';

describe('formatNumber', () => {
  it('writes fixed decimals with a minus sign', () => {
    expect(formatNumber(3.456, { decimals: 1 })).toBe('3.5');
    expect(formatNumber(-3.456, { decimals: 1 })).toBe(`${MINUS}3.5`);
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(0.5, { decimals: 2 })).toBe('0.50');
  });

  it('writes a plus sign when asked, and no sign for zero', () => {
    expect(formatNumber(2, { signed: true })).toBe('+2');
    expect(formatNumber(0, { signed: true })).toBe('0');
    expect(formatNumber(-0.04, { decimals: 1 })).toBe('0.0');
    expect(formatNumber(-0)).toBe('0');
  });

  it('writes infinities with letters the Latin fonts have', () => {
    expect(formatNumber(Number.NEGATIVE_INFINITY)).toBe(`${MINUS}inf`);
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('inf');
    expect(formatNumber(Number.POSITIVE_INFINITY, { signed: true })).toBe('+inf');
    expect(formatNumber(Number.NaN)).toBe('NaN');
  });
});

describe('formatFrequency', () => {
  it('keeps three significant digits in Hz and kHz', () => {
    expect(formatFrequency(440)).toBe('440 Hz');
    expect(formatFrequency(44.1)).toBe('44.1 Hz');
    expect(formatFrequency(5)).toBe('5.00 Hz');
    expect(formatFrequency(1250)).toBe('1.25 kHz');
    expect(formatFrequency(12_500)).toBe('12.5 kHz');
    expect(formatFrequency(20_000)).toBe('20.0 kHz');
    expect(formatFrequency(0)).toBe('0 Hz');
  });

  it('switches units after rounding', () => {
    expect(formatFrequency(999.6)).toBe('1.00 kHz');
    expect(formatFrequency(9996)).toBe('10.0 kHz');
  });

  it('takes another count of digits', () => {
    expect(formatFrequency(1234.6, { digits: 4 })).toBe('1.235 kHz');
  });
});

describe('formatDuration', () => {
  it('writes ms below a second and s from there', () => {
    expect(formatDuration(12.5)).toBe('12.5 ms');
    expect(formatDuration(250)).toBe('250 ms');
    expect(formatDuration(1200)).toBe('1.20 s');
    expect(formatDuration(0.5)).toBe('0.500 ms');
  });
});

describe('formatDecibels', () => {
  it('writes one decimal, a sign when asked, and silence as −inf', () => {
    expect(formatDecibels(-6)).toBe(`${MINUS}6.0 dB`);
    expect(formatDecibels(3, { signed: true })).toBe('+3.0 dB');
    expect(formatDecibels(0, { signed: true })).toBe('0.0 dB');
    expect(formatDecibels(Number.NEGATIVE_INFINITY)).toBe(`${MINUS}inf dB`);
    expect(formatDecibels(-12.25, { decimals: 2 })).toBe(`${MINUS}12.25 dB`);
  });
});

describe('formatPercent', () => {
  it('writes a fraction as a percentage', () => {
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(0.125, { decimals: 1 })).toBe('12.5%');
    expect(formatPercent(1)).toBe('100%');
  });
});

describe('decimalsOf', () => {
  it('counts the digits after the point of a step', () => {
    expect(decimalsOf(1)).toBe(0);
    expect(decimalsOf(5)).toBe(0);
    expect(decimalsOf(0.5)).toBe(1);
    expect(decimalsOf(0.25)).toBe(2);
    expect(decimalsOf(0.01)).toBe(2);
    expect(decimalsOf(1e-7)).toBe(7);
    expect(decimalsOf(1.5e-7)).toBe(8);
    expect(decimalsOf(1e21)).toBe(0);
    expect(decimalsOf(Number.NaN)).toBe(0);
  });

  it('keeps binary noise out of a readout', () => {
    expect(formatNumber(0.1 + 0.2, { decimals: decimalsOf(0.1) })).toBe('0.3');
  });
});
