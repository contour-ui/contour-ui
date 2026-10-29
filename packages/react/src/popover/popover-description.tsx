import { Popover as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type PopoverDescriptionProps = Headless.DescriptionProps;

/** Popover description: a `div` of supporting text that describes the popover, in a muted color. */
export function PopoverDescription({ className, ...props }: PopoverDescriptionProps): ReactElement {
  return (
    <Headless.Description className={cx('contour-popover__description', className)} {...props} />
  );
}
