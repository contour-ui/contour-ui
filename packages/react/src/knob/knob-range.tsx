import { Knob as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type KnobRangeProps = Headless.RangeProps;

/**
 * Knob range: the arc from the origin to the value, in the accent fill, brighter while the dial
 * is hovered or dragged.
 */
export function KnobRange({ className, ...props }: KnobRangeProps): ReactElement {
  return <Headless.Range className={cx('contour-knob__range', className)} {...props} />;
}
