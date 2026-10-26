import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type CardBodyProps = PrimitiveProps<'div'>;

/**
 * Card body: a `div` with the main content. It takes the free height of the
 * card, so the footers of cards stretched to one row height line up.
 */
export function CardBody({ className, ...props }: CardBodyProps): ReactElement {
  const ownProps = {
    className: cx('contour-card__body', className),
    'data-scope': 'card',
    'data-part': 'body',
  };
  return <Primitive.div {...mergeProps(ownProps, props)} />;
}
