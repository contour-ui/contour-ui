'use client';

import { mergeProps, Primitive } from '@contour-ui/headless';
import type { PrimitiveProps } from '@contour-ui/headless';
import { use, useLayoutEffect } from 'react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';
import { CodeBlockContext } from './code-block-context.ts';

export type CodeBlockTitleProps = PrimitiveProps<'span'>;

/**
 * The title: a `span` in the header, such as the file name of the code. It
 * takes the free width of the header and wraps there, so actions after it
 * stay at the end of the row. While it is mounted, it names `CodeBlock.Root`
 * (`aria-labelledby` with its `id`, which it gets from the root unless you
 * pass one).
 */
export function CodeBlockTitle({ className, ...props }: CodeBlockTitleProps): ReactElement {
  const context = use(CodeBlockContext);
  const id = props.id ?? context?.titleId;
  const register = context?.registerTitle;
  // After the first render: the server render and hydration name nothing, then the root
  // points at the title.
  useLayoutEffect(() => {
    if (id === undefined || register === undefined) {
      return undefined;
    }
    return register(id);
  }, [id, register]);

  const ownProps = {
    className: cx('contour-code-block__title', className),
    'data-scope': 'code-block',
    'data-part': 'title',
    id,
  };

  return <Primitive.span {...mergeProps(ownProps, props)} />;
}
