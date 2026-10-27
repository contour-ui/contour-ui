'use client';

import { createContext } from 'react';
import type { Context } from 'react';

/** What `SearchProvider` gives the search triggers. */
export interface SearchContextValue {
  /** Whether the search dialog is open. */
  readonly open: boolean;
  /** Open the search dialog. */
  readonly openSearch: () => void;
}

/**
 * The search of the nearest `SearchProvider`: `null` outside of one, as on a site without search
 * (`DocsProvider`'s `search={false}`), where the triggers render nothing.
 */
export const SearchContext: Context<SearchContextValue | null> =
  createContext<SearchContextValue | null>(null);
