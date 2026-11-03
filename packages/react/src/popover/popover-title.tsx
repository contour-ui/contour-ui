import { Popover as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type PopoverTitleProps = Headless.TitleProps;

/**
 * Popover title: a `div` in the heading text style that names the popover. For a heading
 * element, pass one with `asChild`.
 */
export function PopoverTitle({ className, ...props }: PopoverTitleProps): ReactElement {
  return <Headless.Title className={cx('contour-popover__title', className)} {...props} />;
}
