'use client';

import { createContext, use, useLayoutEffect, useRef, useState } from 'react';
import type { Context, RefCallback } from 'react';

import { readTabGroup, selectInTabGroup, subscribeToTabGroup } from './tab-groups.ts';

/** What the tabs of a page share with Fumadocs' tabs (`Tabs`, `CodeBlockTabs`). */
export interface DocsTabsOptions {
  /**
   * Tabs that share the selected tab, on the page and across pages: a reader's choice in one of
   * them selects the same tab in the others that have it. The group remembers the choice for the
   * session, in `sessionStorage` under this id.
   */
  readonly groupId?: string | undefined;
  /**
   * The group remembers the choice across visits too, in `localStorage` under its id. Only with
   * `groupId`.
   *
   * @defaultValue false
   */
  readonly persist?: boolean | undefined;
  /**
   * A tab the reader selects puts its `id` in the address (`#id`), replacing the history entry,
   * so the address links to it. Only tabs with an `id`.
   *
   * @defaultValue false
   */
  readonly updateAnchor?: boolean | undefined;
}

/** The selection of one tabs, and how its parts report themselves. */
export interface DocsTabs {
  /** The selected tab, or `null` for none. */
  readonly value: string | null;
  /**
   * Select a tab as the reader does: in the whole group with `groupId`, stored, and in the address
   * with `updateAnchor`.
   */
  readonly select: (value: string) => void;
  /** Tells the tabs the element of its root, which a link to one of its tabs scrolls to. */
  readonly rootRef: RefCallback<HTMLElement>;
  /** Tells the tabs it has a trigger for `value`: a group's value without one is ignored. */
  readonly triggerRef: (value: string) => RefCallback<HTMLElement>;
  /**
   * Tells the tabs the panel of `value` and the `id` given to it, if any: the address opens the
   * panel it points into, and `updateAnchor` writes the id.
   */
  readonly contentRef: (value: string, id: string | undefined) => RefCallback<HTMLElement>;
}

/** The mounted parts of one tabs, outside React state: read by effects and handlers. */
interface Registry {
  root: HTMLElement | null;
  /** The values of the mounted triggers, with how many triggers each has. */
  readonly triggers: Map<string, number>;
  /** The mounted panels, by value. */
  readonly panels: Map<string, HTMLElement>;
  /** The ids given to panels, by value: what `updateAnchor` writes. */
  readonly ids: Map<string, string>;
  /** Ref callbacks of the triggers and panels, stable per value (and id). */
  readonly refs: Map<string, RefCallback<HTMLElement>>;
  readonly rootRef: RefCallback<HTMLElement>;
}

/** A panel to scroll to once it shows, and the element to bring into view. */
interface Reveal {
  readonly value: string;
  readonly element: HTMLElement;
}

/** The element the address points at (`#id`), or `null`. */
function hashTarget(): HTMLElement | null {
  const hash = window.location.hash.slice(1);
  if (hash === '') {
    return null;
  }
  let id = hash;
  try {
    id = decodeURIComponent(hash);
  } catch {
    // Not percent-encoded text: the id as it is.
  }
  return document.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
}

function createRegistry(): Registry {
  const registry: Registry = {
    root: null,
    triggers: new Map(),
    panels: new Map(),
    ids: new Map(),
    refs: new Map(),
    rootRef: (element) => {
      registry.root = element;
      return () => {
        if (registry.root === element) {
          registry.root = null;
        }
      };
    },
  };
  return registry;
}

/**
 * The selection of the tabs of a page, with what Fumadocs' tabs add to the styled Tabs: a group
 * of tabs that share it (`groupId`), remembered for the session or across visits (`persist`); the
 * address, which opens the tab it points into and which `updateAnchor` keeps on the selected tab.
 *
 * The server and the hydration render show `defaultValue`; the remembered tab and the one the
 * address points into follow before the browser paints again. Tabs that the address points into
 * scroll into view once they show.
 */
export function useDocsTabs(
  defaultValue: string | null,
  { groupId, persist = false, updateAnchor = false }: DocsTabsOptions,
): DocsTabs {
  const [registry] = useState(createRegistry);
  const [value, setValue] = useState<string | null>(defaultValue);
  // The value as last rendered, for the handler of `hashchange`, and a panel to scroll to.
  const shown = useRef<string | null>(value);
  const pending = useRef<Reveal | null>(null);

  useLayoutEffect(() => {
    shown.current = value;
    const reveal = pending.current;
    if (reveal !== null && reveal.value === value) {
      pending.current = null;
      reveal.element.scrollIntoView();
    }
  }, [value]);

  // The group: the tab it remembers, then each tab selected in it, when this tabs has it.
  useLayoutEffect(() => {
    if (groupId === undefined) {
      return undefined;
    }
    const apply = (next: string): void => {
      if (registry.triggers.has(next)) {
        setValue(next);
      }
    };
    const remembered = readTabGroup(groupId, persist);
    if (remembered !== null) {
      apply(remembered);
    }
    return subscribeToTabGroup(groupId, apply);
  }, [registry, groupId, persist]);

  // The address: a panel it points at, or into, opens and scrolls into view; after the group,
  // so it wins over the remembered tab.
  useLayoutEffect(() => {
    const open = (): void => {
      const target = hashTarget();
      if (target === null) {
        return;
      }
      for (const [panelValue, panel] of registry.panels) {
        if (panel.contains(target)) {
          // A link to the panel itself shows the tabs from the top, the triggers included.
          const element = target === panel ? (registry.root ?? panel) : target;
          // Set even when shown: it replaces a remembered tab the group has just asked for.
          setValue(panelValue);
          if (shown.current === panelValue) {
            element.scrollIntoView();
          } else {
            pending.current = { value: panelValue, element };
          }
          return;
        }
      }
    };
    open();
    window.addEventListener('hashchange', open);
    return () => {
      window.removeEventListener('hashchange', open);
    };
  }, [registry]);

  return {
    value,
    select: (next) => {
      setValue(next);
      if (groupId !== undefined) {
        selectInTabGroup(groupId, next, persist);
      }
      const id = registry.ids.get(next);
      if (updateAnchor && id !== undefined) {
        // The state of the entry stays: routers keep theirs there.
        window.history.replaceState(window.history.state, '', `#${id}`);
      }
    },
    rootRef: registry.rootRef,
    triggerRef: (triggerValue) => {
      const key = `trigger:${triggerValue}`;
      let ref = registry.refs.get(key);
      if (ref === undefined) {
        ref = (element) => {
          if (element === null) {
            return undefined;
          }
          registry.triggers.set(triggerValue, (registry.triggers.get(triggerValue) ?? 0) + 1);
          return () => {
            const count = (registry.triggers.get(triggerValue) ?? 1) - 1;
            if (count > 0) {
              registry.triggers.set(triggerValue, count);
            } else {
              registry.triggers.delete(triggerValue);
            }
          };
        };
        registry.refs.set(key, ref);
      }
      return ref;
    },
    contentRef: (contentValue, id) => {
      const key = `content:${contentValue}:${id ?? ''}`;
      let ref = registry.refs.get(key);
      if (ref === undefined) {
        ref = (element) => {
          if (element === null) {
            return undefined;
          }
          registry.panels.set(contentValue, element);
          if (id !== undefined && id !== '') {
            registry.ids.set(contentValue, id);
          }
          return () => {
            if (registry.panels.get(contentValue) === element) {
              registry.panels.delete(contentValue);
            }
            if (registry.ids.get(contentValue) === id) {
              registry.ids.delete(contentValue);
            }
          };
        };
        registry.refs.set(key, ref);
      }
      return ref;
    },
  };
}

/** The nearest tabs of the MDX content, for its parts. */
export const DocsTabsContext: Context<DocsTabs | null> = createContext<DocsTabs | null>(null);

/** The nearest tabs of the MDX content; throws outside of one. */
export function useDocsTabsContext(): DocsTabs {
  const tabs = use(DocsTabsContext);
  if (tabs === null) {
    throw new Error(
      '@contour-ui/fumadocs: render the parts of tabs inside <Tabs> or <CodeBlockTabs>.',
    );
  }
  return tabs;
}
