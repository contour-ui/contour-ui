import { Dialog as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type DrawerDescriptionProps = Headless.DescriptionProps;

/** Drawer description: a `p` of supporting text that describes the drawer, under its title. */
export function DrawerDescription({ className, ...props }: DrawerDescriptionProps): ReactElement {
  return (
    <Headless.Description className={cx('contour-drawer__description', className)} {...props} />
  );
}
