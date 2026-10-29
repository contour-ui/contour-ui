'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useTocContext } from './toc-context.ts';

export type TocTitleProps = PrimitiveProps<'div'>;

/**
 * Table of contents title: a `div`, such as "On this page", that names the `nav` of the root
 * while it is mounted. Its `id` comes from the root unless you pass one. For a heading in the
 * outline of the page, pass one with `asChild`.
 *
 * @example
 * <Toc.Title>On this page</Toc.Title>
 */
export function TocTitle({ ref, ...props }: TocTitleProps): ReactElement {
  const api = useTocContext();
  const { ref: titleRef, ...titleProps } = api.getTitleProps();
  const composedRef = useComposedRefs<HTMLDivElement>(titleRef, ref);
  return <Primitive.div {...mergeProps(titleProps, props)} ref={composedRef} />;
}
