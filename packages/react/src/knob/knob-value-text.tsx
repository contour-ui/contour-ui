import { Knob as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type KnobValueTextProps = Headless.ValueTextProps;

/**
 * Knob value text: the readout of the value below the dial, in the monospace `value` text style,
 * so digits do not shift while it turns.
 */
export function KnobValueText({ className, ...props }: KnobValueTextProps): ReactElement {
  return <Headless.ValueText className={cx('contour-knob__value-text', className)} {...props} />;
}
