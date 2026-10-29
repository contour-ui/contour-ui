'use client';

import { createContext, use } from 'react';
import type { Context } from 'react';

import type { UseTabsReturn } from './use-tabs.ts';

/** The API of the nearest `Tabs.Root`, for its parts. */
export const TabsContext: Context<UseTabsReturn | null> = createContext<UseTabsReturn | null>(null);

/**
 * The API of the nearest `Tabs.Root`: the selected tab, the focused trigger, functions such as
 * `setValue` and `focus`, and the props of its elements. For parts of your own inside the root;
 * throws outside of one.
 *
 * @example
 * function CurrentTab(): ReactElement {
 *   const { value } = useTabsContext();
 *   return <p>{`Showing ${value ?? 'nothing'}`}</p>;
 * }
 */
export function useTabsContext(): UseTabsReturn {
  const api = use(TabsContext);
  if (api === null) {
    throw new Error('Tabs: render the parts inside <Tabs.Root>.');
  }
  return api;
}
