import { Dialog as Headless, mergeProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';
import { useDrawerStyle } from './drawer-context.ts';

export type DrawerContentProps = Headless.ContentProps;

/**
 * Drawer content: the drawer itself, a panel on the surface color against its edge of the
 * viewport, with a border on its inner side and a shadow. From `start` or `end` it is as high
 * as the viewport and as wide as `size`; from `top` or `bottom`, as wide as the viewport and as
 * high as its content, up to `size`. It slides in from its edge and back out, and only fades
 * under reduced motion. It stacks its parts; `Drawer.Body` scrolls between the header and the
 * footer.
 *
 * @example
 * <Drawer.Content>
 *   <Drawer.CloseTrigger />
 *   <Drawer.Header>
 *     <Drawer.Title>Menu</Drawer.Title>
 *   </Drawer.Header>
 *   <Drawer.Body>…</Drawer.Body>
 * </Drawer.Content>
 */
export function DrawerContent({ className, ...props }: DrawerContentProps): ReactElement | null {
  const { placement, size } = useDrawerStyle();
  const ownProps = {
    className: cx('contour-drawer__content', className),
    'data-placement': placement,
    'data-size': size,
  };
  return <Headless.Content {...mergeProps(ownProps, props)} />;
}
