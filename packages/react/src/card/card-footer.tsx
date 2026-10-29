import { mergeProps, Primitive } from '@contour-ui/headless-react';
import type { PrimitiveProps } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type CardFooterProps = PrimitiveProps<'div'>;

/** Card footer: a `div` at the bottom that lays out actions or metadata in a row. */
export function CardFooter({ className, ...props }: CardFooterProps): ReactElement {
  const ownProps = {
    className: cx('contour-card__footer', className),
    'data-scope': 'card',
    'data-part': 'footer',
  };
  return <Primitive.div {...mergeProps(ownProps, props)} />;
}
