import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type CodeBlockHeaderProps = PrimitiveProps<'figcaption'>;

/**
 * The header: a `figcaption` with the title, and actions after it, in a row
 * above the code, divided from it by a line. It is the caption of the figure,
 * so it names the code block for assistive technology: place it first in
 * `CodeBlock.Root`, where HTML expects a `figcaption`.
 */
export function CodeBlockHeader({ className, ...props }: CodeBlockHeaderProps): ReactElement {
  const ownProps = {
    className: cx('contour-code-block__header', className),
    'data-scope': 'code-block',
    'data-part': 'header',
  };

  return <Primitive.figcaption {...mergeProps(ownProps, props)} />;
}
