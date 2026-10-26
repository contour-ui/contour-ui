import { useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { SearchContext } from './search-context.ts';
import type { SearchContextValue } from './search-context.ts';
import { SearchDialog } from './search-dialog.tsx';
import { isApplePlatform, isSearchShortcut } from './shortcut.ts';

export interface SearchProviderProps {
  readonly children?: ReactNode;
}

/**
 * The state of the search dialog: closed, open, or closed by opening a result, which takes the
 * focus instead of the element that had it before the dialog opened.
 */
type SearchState = 'closed' | 'open' | 'result-opened';

/**
 * The search of the site. It renders the search dialog once, after its children, opens it from
 * every `SearchTrigger` inside, and listens for the shortcut on the whole page: ⌘K on Apple
 * platforms, Ctrl K elsewhere (`isSearchShortcut` takes either), which closes the dialog again
 * while it is open. A shortcut that the page handled first (`preventDefault()`, as a live example
 * may) is left alone.
 */
export function SearchProvider({ children }: SearchProviderProps): ReactElement {
  const [state, setState] = useState<SearchState>('closed');
  const open = state === 'open';

  useEffect(() => {
    const apple = isApplePlatform();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.isComposing || !isSearchShortcut(event, apple)) {
        return;
      }
      // Chrome and Firefox would focus their own search field with it.
      event.preventDefault();
      // A held key repeats: it toggles the dialog once.
      if (!event.repeat) {
        setState((current) => (current === 'open' ? 'closed' : 'open'));
      }
    };
    // On the window, the last stop on the way up: the page's own handlers come first.
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const search = useMemo<SearchContextValue>(
    () => ({
      open,
      openSearch: () => {
        setState('open');
      },
    }),
    [open],
  );

  return (
    <SearchContext value={search}>
      {children}
      <SearchDialog
        open={open}
        restoreFocus={state !== 'result-opened'}
        onOpenChange={(next) => {
          setState(next ? 'open' : 'closed');
        }}
        onResultOpen={() => {
          setState('result-opened');
        }}
      />
    </SearchContext>
  );
}
