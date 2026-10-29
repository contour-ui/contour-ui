'use client';

import { searchIcon, triangleAlertIcon } from '@contour-ui/icons';
import { createListCollection, Dialog, Icon, Kbd, Listbox, Portal } from '@contour-ui/react';
import { usePathname, useRouter } from 'fumadocs-core/framework';
import type { SearchResultRecord, StaticOptions } from 'fumadocs-core/search/client';
import { useHighlightQuery, useStaticSearch } from 'fumadocs-core/search/client';
import { staticClient } from 'fumadocs-core/search/client/orama-static';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactElement } from 'react';

import { toPageUrl } from '../layout/page-url.ts';
import {
  destinationOf,
  focusDestination,
  focusTargetBack,
  scrollToDestination,
} from './search-focus.ts';
import type { Destination } from './search-focus.ts';
import { groupResults, rankGroups, resultOptions } from './search-groups.ts';
import { SearchResultGroup } from './search-results.tsx';

/**
 * No result is ever selected: picking one opens it, and the listbox keeps no selection, so no
 * option is announced as selected when the dialog opens again.
 */
const NO_SELECTION: readonly string[] = [];

/** The options of the static search for the index at `from`: fumadocs-core's default without it. */
function indexOptions(from: string | undefined): StaticOptions {
  return from === undefined ? {} : { from };
}

/** Start loading the index, which the first search waits for: the client keeps it once loaded. */
async function preloadIndex(from: string | undefined): Promise<void> {
  try {
    await staticClient(indexOptions(from)).search('');
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
      <span className="contour-docs-search__message" data-tone="danger">
        <Icon icon={triangleAlertIcon} />
        The search index did not load. Reload the page to try again.
      </span>
    );
  }
  if (query === undefined) {
    return loading ? <span className="contour-docs-search__message">Searching…</span> : null;
  }
  if (results === 0) {
    return (
      <Listbox.Empty asChild className="contour-docs-search__message">
        <span>{`No results for “${query}”`}</span>
      </Listbox.Empty>
    );
  }
  return (
    <span className="contour-docs-search__visually-hidden">
      {results === 1 ? '1 result' : `${results} results`}
    </span>
  );
}

interface SearchPanelProps {
  /** The URL of the search index, or `undefined` for fumadocs-core's default. */
  readonly from: string | undefined;
  /** Whether the dialog is open. */
  readonly open: boolean;
  /** Close the dialog, for a result the user opens. */
  readonly onResultOpen: () => void;
}

/**
 * The content of the search dialog: the field, the results and their status. It runs the static
 * search of fumadocs-core on the index its search server exports (`from`), which starts to load
 * as the dialog first opens. Picking a result closes the dialog, goes to it through the
 * framework's router, and moves the focus there once the page shows it.
 */
function SearchPanel({ from, open, onResultOpen }: SearchPanelProps): ReactElement {
  const { search, onSearchChange, isLoading, data, error } = useStaticSearch(indexOptions(from));
  const router = useRouter();
  const pathname = usePathname();
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
    void preloadIndex(from);
  }, [from]);

  // Each time the dialog opens, the focus that moves into the field selects the query, so typing
  // replaces it.
  const selectOnFocus = useRef(false);
  useLayoutEffect(() => {
    if (open) {
      selectOnFocus.current = true;
    }
  }, [open]);

  // Where a result on another page leads, until the framework shows another page, and the
  // pathname it was opened from: the focus then moves there, once the page is the result's.
  const opening = useRef<{ readonly destination: Destination; readonly from: string } | null>(null);
  useEffect(() => {
    const target = opening.current;
    if (target === null || target.from === pathname) {
      return;
    }
    opening.current = null;
    if (target.destination.page === toPageUrl(pathname)) {
      focusDestination(target.destination.hash);
    }
  }, [pathname]);

  const openResult = (result: SearchResultRecord): void => {
    const destination = destinationOf(result.url);
    const samePage = destination.page === toPageUrl(pathname);
    // The address the page is at already: a link to it would replace its history entry with the
    // same one, so the page stays, and only scrolls there below, as the router would.
    const here = samePage && destination.hash === window.location.hash;
    onResultOpen();
    if (!here) {
      void router.push(result.url);
    }
    if (!samePage) {
      opening.current = { destination, from: pathname };
      return;
    }
    // A heading of this page, or the page itself: the pathname stays, and the framework scrolls
    // to a heading it goes to. The focus moves on the next frame, once the dialog has closed: it
    // keeps the focus inside while it is open.
    requestAnimationFrame(() => {
      if (here) {
        scrollToDestination(destination.hash);
      }
      focusDestination(destination.hash);
    });
  };

  return (
    <Listbox.Root
      className="contour-docs-search__listbox"
      collection={collection}
      value={NO_SELECTION}
      autoHighlight
      onSelect={({ item }) => {
        openResult(item);
      }}
    >
      <div className="contour-docs-search__bar">
        <div className="contour-docs-search__field">
          <Icon icon={searchIcon} />
          <Listbox.Input
            className="contour-docs-search__input"
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
        className="contour-docs-search__results"
        aria-label="Results"
        hidden={collection.size === 0}
      >
        {groups.map((group) => (
          <SearchResultGroup key={group.page.id} group={group} highlightRef={highlightRef} />
        ))}
      </Listbox.Content>
      <output className="contour-docs-search__status">
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
  /** The URL of the search index, or `undefined` for fumadocs-core's default. */
  readonly from: string | undefined;
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
  from,
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
        <Dialog.Positioner className="contour-docs-search-positioner">
          <Dialog.Content className="contour-docs-search">
            <Dialog.Title className="contour-docs-search__visually-hidden">Search</Dialog.Title>
            <SearchPanel from={from} open={open} onResultOpen={onResultOpen} />
            <div className="contour-docs-search__footer">
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
