import { describe, expect, it } from 'vite-plus/test';

import { clampPosition, linearScale, logScale, powerScale, resolveScale } from './scale.ts';

describe('linearScale', () => {
  it('spreads the range evenly and clamps both ways', () => {
    expect(linearScale.toPosition(25, 0, 100)).toBe(0.25);
    expect(linearScale.toPosition(-12, -12, 12)).toBe(0);
    expect(linearScale.toPosition(0, -12, 12)).toBe(0.5);
    expect(linearScale.toPosition(150, 0, 100)).toBe(1);
    expect(linearScale.toPosition(-1, 0, 100)).toBe(0);
    expect(linearScale.toValue(0.25, 0, 100)).toBe(25);
    expect(linearScale.toValue(2, 0, 100)).toBe(100);
  });

  it('puts a range of one value at position 0', () => {
    expect(linearScale.toPosition(5, 5, 5)).toBe(0);
    expect(linearScale.toValue(0.5, 5, 5)).toBe(5);
  });
});

describe('logScale', () => {
  it('gives equal ratios equal travel', () => {
    // 20 Hz to 20 kHz is three decades: each one takes a third.
    expect(logScale.toPosition(200, 20, 20_000)).toBeCloseTo(1 / 3, 12);
    expect(logScale.toPosition(2000, 20, 20_000)).toBeCloseTo(2 / 3, 12);
    expect(logScale.toValue(0.5, 20, 20_000)).toBeCloseTo(Math.sqrt(20 * 20_000), 9);
    expect(logScale.toValue(0, 20, 20_000)).toBe(20);
    expect(logScale.toValue(1, 20, 20_000)).toBeCloseTo(20_000, 9);
  });

  it('clamps values out of the range, zero included', () => {
    expect(logScale.toPosition(0, 20, 20_000)).toBe(0);
    expect(logScale.toPosition(10, 20, 20_000)).toBe(0);
    expect(logScale.toPosition(1e9, 20, 20_000)).toBe(1);
  });

  it('throws for a range that is not above zero', () => {
    expect(() => logScale.toPosition(1, 0, 100)).toThrow(RangeError);
    expect(() => logScale.toValue(0.5, -10, 10)).toThrow(/above zero/u);
  });
});

describe('powerScale', () => {
  it('gives the low end more travel with an exponent above 1', () => {
    const attack = powerScale(2);
    expect(attack.toPosition(250, 0, 1000)).toBeCloseTo(0.5, 12);
    expect(attack.toValue(0.5, 0, 1000)).toBeCloseTo(250, 9);
    expect(attack.toPosition(2000, 0, 1000)).toBe(1);
  });

  it('is linear at 1, and rejects exponents that are not above zero', () => {
    expect(powerScale(1).toPosition(30, 0, 100)).toBeCloseTo(0.3, 12);
    expect(() => powerScale(0)).toThrow(RangeError);
    expect(() => powerScale(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('resolveScale', () => {
  it('names the built-in scales and passes others through', () => {
    const custom = powerScale(3);
    expect(resolveScale('linear')).toBe(linearScale);
    expect(resolveScale('log')).toBe(logScale);
    expect(resolveScale(custom)).toBe(custom);
  });
});

describe('clampPosition', () => {
  it('keeps positions in [0, 1]', () => {
    expect(clampPosition(-0.5)).toBe(0);
    expect(clampPosition(0.5)).toBe(0.5);
    expect(clampPosition(1.5)).toBe(1);
  });
});
