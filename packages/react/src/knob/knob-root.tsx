import { Knob as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export interface KnobRootProps extends Headless.RootProps {
  /**
   * The diameter of the dial: `sm`, `md` or `lg`, the `--ct-size-knob-*` tokens.
   *
   * @defaultValue 'md'
   */
  size?: 'sm' | 'md' | 'lg' | undefined;
}

/**
 * Knob root: a rotary control for audio-plugin UIs, a column of its label, its dial and its value
 * readout. Runs the knob of `@contour-ui/headless-react`: drag up or down (Shift for fine
 * moves), turn the wheel, use the arrow keys, or double-click to reset. Name it with
 * `Knob.Label` or `aria-label` on `Knob.Control`.
 *
 * @example
 * <Knob.Root min={-60} max={12} defaultValue={0} step={0.1} formatValue={formatDecibels}>
 *   <Knob.Label>Gain</Knob.Label>
 *   <Knob.Control />
 *   <Knob.ValueText />
 * </Knob.Root>
 */
export function KnobRoot({ size = 'md', className, ...props }: KnobRootProps): ReactElement {
  return <Headless.Root className={cx('contour-knob', className)} data-size={size} {...props} />;
}
