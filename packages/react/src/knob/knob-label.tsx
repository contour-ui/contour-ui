import { Knob as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type KnobLabelProps = Headless.LabelProps;

/** Knob label: a muted caption above the dial that names it. */
export function KnobLabel({ className, ...props }: KnobLabelProps): ReactElement {
  return <Headless.Label className={cx('contour-knob__label', className)} {...props} />;
}
