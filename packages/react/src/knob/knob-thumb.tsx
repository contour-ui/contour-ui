import { Knob as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type KnobThumbProps = Headless.ThumbProps;

/** Knob thumb: the line that points at the value, in the default text color. */
export function KnobThumb({ className, ...props }: KnobThumbProps): ReactElement {
  return <Headless.Thumb className={cx('contour-knob__thumb', className)} {...props} />;
}
