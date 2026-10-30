'use client';

import { createContext, use } from 'react';
import type { Context } from 'react';

/** How the tabs look: one variant and one size for every part. */
export interface TabsStyle {
  readonly variant: 'line' | 'enclosed' | 'subtle';
  readonly size: 'sm' | 'md' | 'lg';
}

/** The variant and size of the nearest styled `Tabs.Root`, which its parts render. */
export const TabsStyleContext: Context<TabsStyle> = createContext<TabsStyle>({
  variant: 'line',
  size: 'md',
});

/** The `data-variant` and `data-size` of a part, from the nearest root. */
export function useTabsStyle(): {
  'data-variant': TabsStyle['variant'];
  'data-size': TabsStyle['size'];
} {
  const { variant, size } = use(TabsStyleContext);
  return { 'data-variant': variant, 'data-size': size };
}
