import { Dialog as Headless, mergeProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';
import { useDrawerStyle } from './drawer-context.ts';

export type DrawerPositionerProps = Headless.PositionerProps;

/**
 * Drawer positioner: covers the viewport and holds the content against the edge of
 * `placement`. Presses beside the content go through it to the backdrop.
 */
export function DrawerPositioner({
  className,
  ...props
}: DrawerPositionerProps): ReactElement | null {
  const { placement } = useDrawerStyle();
  const ownProps = {
    className: cx('contour-drawer__positioner', className),
    'data-placement': placement,
  };
  return <Headless.Positioner {...mergeProps(ownProps, props)} />;
}
