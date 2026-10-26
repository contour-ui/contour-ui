import { createContext, use } from 'react';
import type { Context } from 'react';

/**
 * The edge of the viewport the drawer slides in from: `start` and `end` follow the direction of
 * the text (left and right in a left-to-right page), `top` and `bottom` do not.
 */
export type DrawerPlacement = 'start' | 'end' | 'top' | 'bottom';

/** How far the drawer reaches into the viewport from its edge. */
export type DrawerSize = 'sm' | 'md' | 'lg' | 'full';

/** The look of the nearest `Drawer.Root`, for the parts that render it. */
export interface DrawerStyle {
  readonly placement: DrawerPlacement;
  readonly size: DrawerSize;
}

/** The look of the nearest `Drawer.Root`. */
export const DrawerStyleContext: Context<DrawerStyle> = createContext<DrawerStyle>({
  placement: 'start',
  size: 'sm',
});

/** The look of the nearest `Drawer.Root`: the defaults outside of one. */
export function useDrawerStyle(): DrawerStyle {
  return use(DrawerStyleContext);
}
