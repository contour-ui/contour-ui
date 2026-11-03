import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type DrawerFooterProps = PrimitiveProps<'div'>;

/**
 * Drawer footer: a `div` at the bottom that lays out its actions in a row, at the end.
 */
export function DrawerFooter({ className, ...props }: DrawerFooterProps): ReactElement {
  const ownProps = {
    className: cx('contour-drawer__footer', className),
    'data-scope': 'dialog',
    'data-part': 'footer',
  };
  return <Primitive.div {...mergeProps(ownProps, props)} />;
}
