'use client';

import type { toc } from '@contour-ui/core';
import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { TocItemContext, useTocContext } from './toc-context.ts';

export interface TocItemProps extends PrimitiveProps<'li'> {
  /** The heading of the item: its id (`value`) and its level (`depth`). */
  item: toc.Item;
}

/**
 * Table of contents item: an `li` for one heading, with `data-depth` for the indent and
 * `data-active` while the heading is active. Its `Toc.Link` links to the heading.
 *
 * @example
 * <Toc.Item item={{ value: 'install', depth: 2 }}>
 *   <Toc.Link>Install</Toc.Link>
 * </Toc.Item>
 */
export function TocItem({ item, ...props }: TocItemProps): ReactElement {
  const api = useTocContext();
  return (
    <TocItemContext value={item}>
      <Primitive.li {...mergeProps(api.getItemProps(item), props)} />
    </TocItemContext>
  );
}
