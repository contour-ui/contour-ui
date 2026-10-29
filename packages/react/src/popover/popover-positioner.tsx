import { Popover as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type PopoverPositionerProps = Headless.PositionerProps;

/**
 * Popover positioner: holds the content next to the trigger, above the page, stacked with the
 * other overlays. Put it in a `Portal`.
 */
export function PopoverPositioner({
  className,
  ...props
}: PopoverPositionerProps): ReactElement | null {
  return (
    <Headless.Positioner className={cx('contour-popover__positioner', className)} {...props} />
  );
}
