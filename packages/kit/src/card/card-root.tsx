import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export interface CardRootProps extends PrimitiveProps<'div'> {
  /**
   * How the card stands out from the background: `outline` draws a border,
   * `subtle` only fills the surface, `elevated` is a raised surface with a
   * border and a shadow.
   *
   * @defaultValue 'outline'
   */
  variant?: 'outline' | 'subtle' | 'elevated' | undefined;
  /**
   * The padding around the parts and the gap between them.
   *
   * @defaultValue 'md'
   */
  size?: 'sm' | 'md' | 'lg' | undefined;
}

/**
 * Card root: a `div` that holds the other parts. With `asChild`, a link or a
 * button becomes the card, so the whole card is one target with hover and
 * focus styles.
 *
 * @example
 * <Card.Root asChild>
 *   <a href="/docs/kit">
 *     <Card.Body>
 *       <Card.Title>Kit</Card.Title>
 *       <Card.Description>Styled general-purpose components.</Card.Description>
 *     </Card.Body>
 *   </a>
 * </Card.Root>
 */
export function CardRoot({
  variant = 'outline',
  size = 'md',
  className,
  ...props
}: CardRootProps): ReactElement {
  const ownProps = {
    className: cx('contour-card', className),
    'data-scope': 'card',
    'data-part': 'root',
    'data-variant': variant,
    'data-size': size,
  };
  return <Primitive.div {...mergeProps(ownProps, props)} />;
}
