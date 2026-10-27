'use client';

import type { Root } from 'fumadocs-core/page-tree';
import { createContext, use } from 'react';
import type { Context } from 'react';

/** The page tree of the nearest `DocsLayout`, for the page inside. */
export const DocsTreeContext: Context<Root | null> = createContext<Root | null>(null);

/** The page tree of the nearest `DocsLayout`; throws outside of one. */
export function useDocsTree(): Root {
  const tree = use(DocsTreeContext);
  if (tree === null) {
    throw new Error('DocsPage: render it inside <DocsLayout>.');
  }
  return tree;
}
