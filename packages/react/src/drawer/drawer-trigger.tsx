import { Dialog as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type DrawerTriggerProps = Headless.TriggerProps;

/**
 * Drawer trigger: the button that opens the drawer. It has no look of its own: pass a `Button`
 * with `asChild`.
 *
 * @example
 * <Drawer.Trigger asChild>
 *   <Button variant="ghost">Menu</Button>
 * </Drawer.Trigger>
 */
export function DrawerTrigger({ className, ...props }: DrawerTriggerProps): ReactElement {
  return <Headless.Trigger className={cx('contour-drawer__trigger', className)} {...props} />;
}
