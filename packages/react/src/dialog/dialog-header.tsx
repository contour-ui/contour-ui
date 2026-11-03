import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type DialogHeaderProps = PrimitiveProps<'div'>;

/**
 * Dialog header: a `div` at the top that stacks the title and the description.
 */
export function DialogHeader({ className, ...props }: DialogHeaderProps): ReactElement {
  const ownProps = {
    className: cx('contour-dialog__header', className),
    'data-scope': 'dialog',
    'data-part': 'header',
  };
  return <Primitive.div {...mergeProps(ownProps, props)} />;
}
