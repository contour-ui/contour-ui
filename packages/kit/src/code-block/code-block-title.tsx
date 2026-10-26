import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type CodeBlockTitleProps = PrimitiveProps<'span'>;

/**
 * The title: a `span` in the header, such as the file name of the code. It
 * takes the free width of the header and wraps there, so actions after it
 * stay at the end of the row.
 */
export function CodeBlockTitle({ className, ...props }: CodeBlockTitleProps): ReactElement {
  const ownProps = {
    className: cx('contour-code-block__title', className),
    'data-scope': 'code-block',
    'data-part': 'title',
  };

  return <Primitive.span {...mergeProps(ownProps, props)} />;
}
