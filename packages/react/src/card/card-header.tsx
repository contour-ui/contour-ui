import { mergeProps, Primitive } from '@contour-ui/headless-react';
import type { PrimitiveProps } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type CardHeaderProps = PrimitiveProps<'div'>;

/** Card header: a `div` at the top, usually with the title and the description. */
export function CardHeader({ className, ...props }: CardHeaderProps): ReactElement {
  const ownProps = {
    className: cx('contour-card__header', className),
    'data-scope': 'card',
    'data-part': 'header',
  };
  return <Primitive.div {...mergeProps(ownProps, props)} />;
}
