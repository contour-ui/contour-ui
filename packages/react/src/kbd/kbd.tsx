import { mergeProps, Primitive } from '@contour-ui/headless-react';
import type { PrimitiveProps } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export interface KbdProps extends PrimitiveProps<'kbd'> {
  /**
   * `md` for running text and large controls, `sm` for small controls and
   * menus.
   *
   * @defaultValue 'md'
   */
  size?: 'sm' | 'md' | undefined;
}

/**
 * A keyboard key: a `<kbd>` with the `contour-kbd` class, square for a single
 * character. Render one per key of a shortcut. It shows its text as is, so the
 * caller picks the platform's key, such as ⌘ or Ctrl.
 *
 * @example
 * <Kbd>⌘</Kbd> <Kbd>K</Kbd>
 */
export function Kbd({ size = 'md', className, ...props }: KbdProps): ReactElement {
  const ownProps = {
    className: cx('contour-kbd', className),
    'data-scope': 'kbd',
    'data-part': 'root',
    'data-size': size,
  };
  return <Primitive.kbd {...mergeProps(ownProps, props)} />;
}
