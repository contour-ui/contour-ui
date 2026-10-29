import { mergeProps, Primitive } from '@contour-ui/headless-react';
import type { PrimitiveProps } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export interface LinkProps extends PrimitiveProps<'a'> {
  /**
   * `plain` is underlined on hover only, for standalone links. `underline` is
   * always underlined, for links in running text, so they do not stand out by
   * color alone. `neutral` is muted, never underlined and brighter on hover,
   * for lists of navigation links (a site header, an index, a footer), never
   * for links in running text.
   *
   * @defaultValue 'plain'
   */
  variant?: 'underline' | 'plain' | 'neutral' | undefined;
}

/**
 * A link in the accent color, or in a neutral one for navigation lists: an
 * `<a>` (or, with `asChild`, a router's link) with the `contour-link` class.
 * It takes the font of the text around it and adds nothing to external links:
 * set `target` and `rel` yourself.
 *
 * @example
 * <Link href="/docs/guide">Guide</Link>
 * <Link asChild variant="underline">
 *   <RouterLink to="/docs/guide">Guide</RouterLink>
 * </Link>
 * <Link variant="neutral" href="/docs/kit">Kit</Link>
 */
export function Link({ variant = 'plain', className, ...props }: LinkProps): ReactElement {
  const ownProps = {
    className: cx('contour-link', className),
    'data-scope': 'link',
    'data-part': 'root',
    'data-variant': variant,
  };
  return <Primitive.a {...mergeProps(ownProps, props)} />;
}
