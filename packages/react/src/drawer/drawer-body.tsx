import { mergeProps, Primitive } from '@contour-ui/headless-react';
import type { PrimitiveProps } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type DrawerBodyProps = PrimitiveProps<'div'>;

/**
 * Drawer body: a `div` with the main content. It takes the free height, so the footer sits at
 * the far end, and scrolls when its content is taller, from edge to edge of the drawer, while
 * the header and the footer stay in view.
 */
export function DrawerBody({ className, ...props }: DrawerBodyProps): ReactElement {
  const ownProps = {
    className: cx('contour-drawer__body', className),
    'data-scope': 'dialog',
    'data-part': 'body',
  };
  return <Primitive.div {...mergeProps(ownProps, props)} />;
}
