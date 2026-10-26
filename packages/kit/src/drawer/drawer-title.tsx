import { Dialog as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type DrawerTitleProps = Headless.TitleProps;

/**
 * Drawer title: an `h2` that names the drawer. For another heading level, pass that heading
 * with `asChild`.
 */
export function DrawerTitle({ className, ...props }: DrawerTitleProps): ReactElement {
  return <Headless.Title className={cx('contour-drawer__title', className)} {...props} />;
}
