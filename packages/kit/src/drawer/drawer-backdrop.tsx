import { Dialog as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type DrawerBackdropProps = Headless.BackdropProps;

/**
 * Drawer backdrop: the scrim over the page behind the drawer, which fades in and out with it.
 * A press on it closes the drawer, unless `closeOnInteractOutside` is off.
 */
export function DrawerBackdrop({ className, ...props }: DrawerBackdropProps): ReactElement | null {
  return <Headless.Backdrop className={cx('contour-drawer__backdrop', className)} {...props} />;
}
