import { mergeProps, Primitive } from '@contour-ui/headless-react';
import type { PrimitiveProps } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type DialogBodyProps = PrimitiveProps<'div'>;

/**
 * Dialog body: a `div` with the main content. It takes the free height, and scrolls when the
 * content is taller than the viewport allows, from edge to edge of the dialog, while the header
 * and the footer stay in view.
 */
export function DialogBody({ className, ...props }: DialogBodyProps): ReactElement {
  const ownProps = {
    className: cx('contour-dialog__body', className),
    'data-scope': 'dialog',
    'data-part': 'body',
  };
  return <Primitive.div {...mergeProps(ownProps, props)} />;
}
