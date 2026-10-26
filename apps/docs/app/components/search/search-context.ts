import { createContext, use } from 'react';
import type { Context } from 'react';

/** What `SearchProvider` gives the search triggers. */
export interface SearchContextValue {
  /** Whether the search dialog is open. */
  readonly open: boolean;
  /** Open the search dialog. */
  readonly openSearch: () => void;
}

/** The search of the nearest `SearchProvider`. */
export const SearchContext: Context<SearchContextValue | null> =
  createContext<SearchContextValue | null>(null);

/** The search of the nearest `SearchProvider`; throws outside of one. */
export function useSearchDialog(): SearchContextValue {
  const search = use(SearchContext);
  if (search === null) {
    throw new Error('SearchTrigger: render it inside <SearchProvider>.');
  }
  return search;
}
