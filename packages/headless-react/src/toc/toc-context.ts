'use client';

import type { toc } from '@contour-ui/core';
import { createContext, use } from 'react';
import type { Context } from 'react';

import type { UseTocReturn } from './use-toc.ts';

/** The API of the nearest `Toc.Root`, for its parts. */
export const TocContext: Context<UseTocReturn | null> = createContext<UseTocReturn | null>(null);

/** The item of the nearest `Toc.Item`, for its link. */
export const TocItemContext: Context<toc.Item | null> = createContext<toc.Item | null>(null);

/**
 * The API of the nearest `Toc.Root`: `items`, `activeIds`, `activeItems`, `getItemState()`,
 * `setActiveIds()`, `scrollTo()` and the props of its elements. For parts of your own inside
 * the root; throws outside of one.
 *
 * @example
 * function ReadingNow(): ReactElement {
 *   const { activeItems } = useTocContext();
 *   return <p>{activeItems.length} sections in view</p>;
 * }
 */
export function useTocContext(): UseTocReturn {
  const api = use(TocContext);
  if (api === null) {
    throw new Error('Toc: render the parts inside <Toc.Root>.');
  }
  return api;
}

/** The item of the nearest `Toc.Item`; throws outside of one. */
export function useTocItemContext(): toc.Item {
  const item = use(TocItemContext);
  if (item === null) {
    throw new Error('Toc: render Toc.Link inside <Toc.Item>.');
  }
  return item;
}
