import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type DrawerHeaderProps = PrimitiveProps<'div'>;

/**
 * Drawer header: a `div` at the top that stacks the title and the description.
 */
export function DrawerHeader({ className, ...props }: DrawerHeaderProps): ReactElement {
  const ownProps = {
    className: cx('contour-drawer__header', className),
    'data-scope': 'dialog',
    'data-part': 'header',
  };
  return <Primitive.div {...mergeProps(ownProps, props)} />;
}
