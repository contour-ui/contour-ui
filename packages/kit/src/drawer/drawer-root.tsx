import { Dialog as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { DrawerStyleContext } from './drawer-context.ts';
import type { DrawerPlacement, DrawerSize } from './drawer-context.ts';

export interface DrawerRootProps extends Headless.RootProps {
  /**
   * The edge the drawer slides in from. `start` and `end` follow the direction of the text.
   *
   * @defaultValue 'start'
   */
  placement?: DrawerPlacement | undefined;
  /**
   * How far the drawer reaches in: its width from `start` or `end`, its greatest height from
   * `top` or `bottom`; `full` covers the viewport.
   *
   * @defaultValue 'sm'
   */
  size?: DrawerSize | undefined;
}

/**
 * Drawer root: renders no element. A drawer is a dialog that slides in from an edge of the
 * viewport, such as the navigation of a page on a phone: it runs the dialog of
 * `@contour-ui/headless`, with every option of `Dialog.Root`, and gives its parts the state and
 * the look (`placement`, `size`). Put the backdrop and the positioner in a `Portal`.
 *
 * @example
 * <Drawer.Root>
 *   <Drawer.Trigger asChild>
 *     <IconButton label="Open the menu" icon={menuIcon} variant="ghost" />
 *   </Drawer.Trigger>
 *   <Portal>
 *     <Drawer.Backdrop />
 *     <Drawer.Positioner>
 *       <Drawer.Content>
 *         <Drawer.CloseTrigger />
 *         <Drawer.Header>
 *           <Drawer.Title>Menu</Drawer.Title>
 *         </Drawer.Header>
 *         <Drawer.Body>…</Drawer.Body>
 *       </Drawer.Content>
 *     </Drawer.Positioner>
 *   </Portal>
 * </Drawer.Root>
 */
export function DrawerRoot({
  placement = 'start',
  size = 'sm',
  ...props
}: DrawerRootProps): ReactElement {
  return (
    <DrawerStyleContext value={{ placement, size }}>
      <Headless.Root {...props} />
    </DrawerStyleContext>
  );
}
