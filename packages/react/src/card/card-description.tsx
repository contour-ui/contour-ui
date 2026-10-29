import { mergeProps, Primitive } from '@contour-ui/headless-react';
import type { PrimitiveProps } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type CardDescriptionProps = PrimitiveProps<'p'>;

/**
 * Card description: a `p` of supporting text under the title. For block
 * content, such as paragraphs of its own, pass a `div` with `asChild`.
 */
export function CardDescription({ className, ...props }: CardDescriptionProps): ReactElement {
  const ownProps = {
    className: cx('contour-card__description', className),
    'data-scope': 'card',
    'data-part': 'description',
  };
  return <Primitive.p {...mergeProps(ownProps, props)} />;
}
