import { mergeProps, Primitive } from '@contour-ui/headless-react';
import type { PrimitiveProps } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type DialogFooterProps = PrimitiveProps<'div'>;

/**
 * Dialog footer: a `div` at the bottom that lays out its actions in a row, at the end.
 */
export function DialogFooter({ className, ...props }: DialogFooterProps): ReactElement {
  const ownProps = {
    className: cx('contour-dialog__footer', className),
    'data-scope': 'dialog',
    'data-part': 'footer',
  };
  return <Primitive.div {...mergeProps(ownProps, props)} />;
}
