import { mergeProps, Primitive } from '@contour-ui/headless-react';
import type { PrimitiveProps } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type CodeBlockHeaderProps = PrimitiveProps<'figcaption'>;

/**
 * The header: a `figcaption` with the title, and actions after it such as
 * `CodeBlock.CopyTrigger`, in a row above the code, divided from it by a
 * line. Place it first in `CodeBlock.Root`, where HTML expects a
 * `figcaption`. Render it only with a title: the title names the figure, and
 * a caption that held only a button would name it after the button.
 */
export function CodeBlockHeader({ className, ...props }: CodeBlockHeaderProps): ReactElement {
  const ownProps = {
    className: cx('contour-code-block__header', className),
    'data-scope': 'code-block',
    'data-part': 'header',
  };

  return <Primitive.figcaption {...mergeProps(ownProps, props)} />;
}
