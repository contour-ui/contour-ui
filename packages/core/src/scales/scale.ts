/**
 * How a control spreads a range of values over its travel: `toPosition` takes a value to a
 * position from 0 (at `min`) to 1 (at `max`), and `toValue` takes it back. Both clamp, so a value
 * out of the range sits at an end. Plain functions of the range, so a scale is a constant that
 * any control shares.
 */
export interface Scale {
  /** The position of `value` in `[min, max]`: 0 at `min`, 1 at `max`, clamped to `[0, 1]`. */
  readonly toPosition: (value: number, min: number, max: number) => number;
  /** The value at `position`, clamped to `[0, 1]` first. */
  readonly toValue: (position: number, min: number, max: number) => number;
}

/** A position clamped to `[0, 1]`. */
export function clampPosition(position: number): number {
  return Math.min(1, Math.max(0, position));
}

/**
 * The scale of most controls: equal steps of value take equal steps of travel (gain in dB,
 * pan, mix). A range of one value is at position 0.
 */
export const linearScale: Scale = {
  toPosition: (value, min, max) => (max === min ? 0 : clampPosition((value - min) / (max - min))),
  toValue: (position, min, max) => min + clampPosition(position) * (max - min),
};

/**
 * Equal ratios of value take equal steps of travel, as the ear hears pitch: 20 Hz to 200 Hz
 * takes as much travel as 2 kHz to 20 kHz. For frequencies and times. The range must be above
 * zero; a range that is not throws a `RangeError`.
 */
export const logScale: Scale = {
  toPosition: (value, min, max) => {
    assertPositiveRange(min, max);
    if (max === min) {
      return 0;
    }
    return clampPosition(Math.log(Math.max(value, min) / min) / Math.log(max / min));
  },
  toValue: (position, min, max) => {
    assertPositiveRange(min, max);
    return min * (max / min) ** clampPosition(position);
  },
};

function assertPositiveRange(min: number, max: number): void {
  if (!(min > 0 && max > 0)) {
    throw new RangeError(`logScale: the range must be above zero (got ${min} to ${max}).`);
  }
}

/**
 * A curve between linear and logarithmic: the position is the linear one raised to
 * `1 / exponent`. An exponent above 1 gives the low end more travel (a skewed time or
 * frequency range that starts at zero), below 1 the high end; 1 is {@link linearScale}.
 *
 * @example
 * // Half of the travel covers the first quarter of 0–1000 ms.
 * const attack = powerScale(2);
 * attack.toPosition(250, 0, 1000); // 0.5
 */
export function powerScale(exponent: number): Scale {
  if (!(exponent > 0) || !Number.isFinite(exponent)) {
    throw new RangeError(
      `powerScale: the exponent must be a finite number above zero (got ${exponent}).`,
    );
  }
  return {
    toPosition: (value, min, max) => linearScale.toPosition(value, min, max) ** (1 / exponent),
    toValue: (position, min, max) => min + clampPosition(position) ** exponent * (max - min),
  };
}

/** A scale by name, as props take it, or a scale of one's own. */
export type ScaleOption = 'linear' | 'log' | Scale;

/** The scale an option names: `'linear'` and `'log'` are {@link linearScale} and {@link logScale}. */
export function resolveScale(option: ScaleOption): Scale {
  if (option === 'linear') {
    return linearScale;
  }
  if (option === 'log') {
    return logScale;
  }
  return option;
}
