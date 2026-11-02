import { decimalsOf, formatNumber } from '../../format/index.ts';
import { resolveScale } from '../../scales/index.ts';
import type { Scale } from '../../scales/index.ts';
import type { KnobProps } from './knob.types.ts';

/** The range a knob's props describe, with its scale resolved and its origin in range. */
export interface KnobRange {
  readonly min: number;
  readonly max: number;
  readonly step: number | undefined;
  readonly scale: Scale;
  readonly origin: number;
}

/** The value clamped to `[min, max]`. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** The step of the props, or `undefined` for a continuous knob (no step, or one not above zero). */
function stepOf(step: number | undefined): number | undefined {
  return step !== undefined && step > 0 && Number.isFinite(step) ? step : undefined;
}

/** The range of a knob from its props. */
export function knobRange(
  props: Pick<KnobProps, 'min' | 'max' | 'step' | 'scale' | 'origin'>,
): KnobRange {
  const { min, max } = props;
  return {
    min,
    max,
    step: stepOf(props.step),
    scale: resolveScale(props.scale),
    origin: clamp(props.origin ?? min, min, max),
  };
}

/**
 * A value on the knob: clamped to the range and snapped to the nearest multiple of `step` from
 * `min`, without the noise of binary fractions (`0.30000000000000004` is `0.3`). A continuous
 * value keeps twelve significant digits, so `0.55 * 100` is `55`.
 */
export function snapValue(value: number, range: Pick<KnobRange, 'min' | 'max' | 'step'>): number {
  const { min, max, step } = range;
  const clamped = clamp(value, min, max);
  if (step === undefined) {
    return Number.isFinite(clamped) ? clamp(Number(clamped.toPrecision(12)), min, max) : clamped;
  }
  const snapped = min + Math.round((clamped - min) / step) * step;
  const decimals = Math.min(20, Math.max(decimalsOf(step), decimalsOf(min)));
  return clamp(Number(snapped.toFixed(decimals)), min, max);
}

/** The position of a value on the travel, from 0 to 1. */
export function positionOf(value: number, range: KnobRange): number {
  return range.scale.toPosition(value, range.min, range.max);
}

/** The value at a position on the travel, snapped. */
export function valueAt(position: number, range: KnobRange): number {
  return snapValue(range.scale.toValue(position, range.min, range.max), range);
}

/**
 * The text of a value without `formatValue`: the decimals of `step`, or for a continuous knob
 * enough to show a hundredth of the range (none for 0–100, two for 0–1).
 */
export function defaultValueText(value: number, range: KnobRange): string {
  const span = range.max - range.min;
  const decimals =
    range.step === undefined
      ? span > 0
        ? Math.min(20, Math.max(0, 2 - Math.floor(Math.log10(span))))
        : 0
      : decimalsOf(range.step);
  return formatNumber(value, { decimals });
}
