import { mergeProps, Primitive } from '@contour-ui/headless-react';
import type { PrimitiveProps } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type CardTitleProps = PrimitiveProps<'h3'>;

/**
 * Card title: an `h3`. For the heading level that fits the page, pass that
 * heading with `asChild`.
 *
 * @example
 * <Card.Title asChild>
 *   <h2>Essentials</h2>
 * </Card.Title>
 */
export function CardTitle({ className, ...props }: CardTitleProps): ReactElement {
  const ownProps = {
    className: cx('contour-card__title', className),
    'data-scope': 'card',
    'data-part': 'title',
  };
  return <Primitive.h3 {...mergeProps(ownProps, props)} />;
}
