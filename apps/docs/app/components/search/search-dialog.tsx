import { searchIcon, triangleAlertIcon } from '@contour-ui/icons';
import { createListCollection, Dialog, Icon, Kbd, Listbox, Portal } from '@contour-ui/kit';
import type { SearchResultRecord } from 'fumadocs-core/search/client';
import { useHighlightQuery, useStaticSearch } from 'fumadocs-core/search/client';
import { staticClient } from 'fumadocs-core/search/client/orama-static';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { destinationOf, focusDestination, focusTargetBack } from './search-focus.ts';
import { groupResults, rankGroups, resultOptions } from './search-groups.ts';
import { SearchResultGroup } from './search-results.tsx';

/**
 * No result is ever selected: picking one opens it, and the listbox keeps no selection, so no
 * option is announced as selected when the dialog opens again.
 */
const NO_SELECTION: readonly string[] = [];

/** Start loading the index, which the first search waits for: the client keeps it once loaded. */
async function preloadIndex(): Promise<void> {
  try {
    await staticClient().search('');
  } catch {
    // The search reports the error once the user types.
  }
}

interface StatusMessageProps {
  /** The query of the results on screen, `undefined` while there are none. */
  readonly query: string | undefined;
  /** How many results there are. */
  readonly results: number;
  readonly loading: boolean;
  readonly failed: boolean;
}

/**
 * The state of the search, under the field: searching, no results, an index that did not
 * load, or, for screen readers only, how many results there are.
 */
function StatusMessage({
  query,
  results,
  loading,
  failed,
}: StatusMessageProps): ReactElement | null {
  if (failed) {
    return (
      <span className="docs-search__message" data-tone="danger">
        <Icon icon={triangleAlertIcon} />
        The search index did not load. Reload the page to try again.
      </span>
    );
  }
  if (query === undefined) {
    return loading ? <span className="docs-search__message">Searching…</span> : null;
  }
  if (results === 0) {
    return (
      <Listbox.Empty asChild className="docs-search__message">
        <span>{`No results for “${query}”`}</span>
      </Listbox.Empty>
    );
  }
  return (
    <span className="docs-search__visually-hidden">
      {results === 1 ? '1 result' : `${results} results`}
    </span>
  );
}

interface SearchPanelProps {
  /** Whether the dialog is open. */
  readonly open: boolean;
  /** Close the dialog, for a result the user opens. */
  readonly onResultOpen: () => void;
}

/**
 * The content of the search dialog: the field, the results and their status. It runs the static
 * search of fumadocs-core on the index prerendered at `/api/search` (`routes/search.ts`), which
 * starts to load as the dialog first opens. Picking a result closes the dialog, goes to it, and
 * moves the focus there once the router shows it.
 */
function SearchPanel({ open, onResultOpen }: SearchPanelProps): ReactElement {
  const { search, onSearchChange, isLoading, data, error } = useStaticSearch();
  const navigate = useNavigate();
  const location = useLocation();
  const failed = error !== undefined;
  // The query of the results on screen: the text of the field may be newer.
  const query = failed ? undefined : data?.query;
  const highlightRef = useHighlightQuery(query ?? '');

  const groups = useMemo(
    () =>
      query === undefined || data === undefined ? [] : rankGroups(groupResults(data.items), query),
    [data, query],
  );
  const collection = useMemo(
    () =>
      createListCollection({
        items: resultOptions(groups),
        itemToValue: (result) => result.id,
        itemToString: (result) => result.content,
      }),
    [groups],
  );

  useEffect(() => {
    void preloadIndex();
  }, []);

  // Each time the dialog opens, the focus that moves into the field selects the query, so typing
  // replaces it.
  const selectOnFocus = useRef(false);
  useLayoutEffect(() => {
    if (open) {
      selectOnFocus.current = true;
    }
  }, [open]);

  // The address of the result being opened, until the router shows it: the focus then moves to
  // its heading or its page, on the page the dialog was opened from as on another one.
  const opening = useRef<string | null>(null);
  useEffect(() => {
    const url = opening.current;
    opening.current = null;
    if (url !== null && url === `${location.pathname}${location.search}${location.hash}`) {
      const destination = destinationOf(location.hash);
      if (destination !== null) {
        focusDestination(destination);
      }
    }
  }, [location]);

  const openResult = (result: SearchResultRecord): void => {
    const here = `${location.pathname}${location.search}${location.hash}`;
    opening.current = result.url;
    onResultOpen();
    // The address the page is at already replaces its history entry, as a link to it does.
    void navigate(result.url, { replace: result.url === here });
  };

  return (
    <Listbox.Root
      className="docs-search__listbox"
      collection={collection}
      value={NO_SELECTION}
      autoHighlight
      onSelect={({ item }) => {
        openResult(item);
      }}
    >
      <div className="docs-search__bar">
        <div className="docs-search__field">
          <Icon icon={searchIcon} />
          <Listbox.Input
            className="docs-search__input"
            aria-label="Search the docs"
            // The list hides while it has no results.
            aria-expanded={collection.size > 0}
            placeholder="Search the docs"
            enterKeyHint="go"
            value={search}
            onChange={(event) => {
              onSearchChange(event.target.value);
            }}
            onFocus={(event) => {
              if (selectOnFocus.current) {
                selectOnFocus.current = false;
                event.currentTarget.select();
              }
            }}
          />
        </div>
        {/* Next to the field, not in it, where an x would clear the text. */}
        <Dialog.CloseTrigger label="Close search" size="md" />
      </div>
      <Listbox.Content
        className="docs-search__results"
        aria-label="Results"
        hidden={collection.size === 0}
      >
        {groups.map((group) => (
          <SearchResultGroup key={group.page.id} group={group} highlightRef={highlightRef} />
        ))}
      </Listbox.Content>
      <output className="docs-search__status">
        <StatusMessage
          query={query}
          results={collection.size}
          loading={isLoading}
          failed={failed}
        />
      </output>
    </Listbox.Root>
  );
}

export interface SearchDialogProps {
  readonly open: boolean;
  /**
   * Whether focus goes back, as the dialog closes, to where it was before it opened: off once
   * the user opened a result, which takes the focus itself.
   */
  readonly restoreFocus: boolean;
  /** Called for a request to open or close the dialog from its parts, Escape or outside it. */
  readonly onOpenChange: (open: boolean) => void;
  /** Called as the user opens a result: close the dialog, without restoring the focus. */
  readonly onResultOpen: () => void;
}

/**
 * The search dialog: Kit's Dialog near the top of the viewport, named "Search", with a Listbox
 * whose input is the search field and whose options are the results, and the keys under them.
 * Its content mounts when it first opens and stays, so the query and its results are still
 * there when it opens again.
 */
export function SearchDialog({
  open,
  restoreFocus,
  onOpenChange,
  onResultOpen,
}: SearchDialogProps): ReactElement {
  // The element that had the focus as the dialog opened, before the dialog moved it in (a frame
  // later): it gets the focus back as the dialog closes, unless a result opened.
  const focusedBefore = useRef<Element | null>(null);
  useLayoutEffect(() => {
    if (open) {
      focusedBefore.current = document.activeElement;
    }
  }, [open]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => {
        onOpenChange(details.open);
      }}
      restoreFocus={restoreFocus}
      finalFocusEl={() => focusTargetBack(focusedBefore.current)}
      placement="top"
      size="md"
      lazyMount
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner className="docs-search-positioner">
          <Dialog.Content className="docs-search">
            <Dialog.Title className="docs-search__visually-hidden">Search</Dialog.Title>
            <SearchPanel open={open} onResultOpen={onResultOpen} />
            <div className="docs-search__footer">
              <span>
                <Kbd size="sm">↑</Kbd> <Kbd size="sm">↓</Kbd> to move
              </span>
              <span>
                <Kbd size="sm">Enter</Kbd> to open
              </span>
              <span>
                <Kbd size="sm">Esc</Kbd> to close
              </span>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
