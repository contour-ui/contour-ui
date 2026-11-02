import { Knob as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type KnobHiddenInputProps = Headless.HiddenInputProps;

/** Knob hidden input: the value of the knob for its form, under the `name` of the root. */
export function KnobHiddenInput({ className, ...props }: KnobHiddenInputProps): ReactElement {
  return (
    <Headless.HiddenInput className={cx('contour-knob__hidden-input', className)} {...props} />
  );
}
