/**
 * The groups of tabs on a page, as Fumadocs has them: tabs with the same `groupId` share the
 * selected tab, and the group remembers it under its id, for the session (`sessionStorage`) or,
 * with `persist`, across visits too (`localStorage`). The storage keys are the group ids
 * themselves, as in `fumadocs-ui`, so a site that moves over keeps its readers' choices.
 *
 * The groups live in this module: every tabs of a page, in any part of the React tree, reaches
 * the others of its group here. Nothing here runs on a server: the tabs call it from effects and
 * event handlers.
 */

type TabGroupListener = (value: string) => void;

/** The tabs of each group on the page, by group id. */
const groups = new Map<string, Set<TabGroupListener>>();

/**
 * The `sessionStorage` or `localStorage` of the page, or `null` where the browser blocks it
 * (reading the property throws there).
 */
function storage(kind: 'session' | 'local'): Storage | null {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function read(kind: 'session' | 'local', key: string): string | null {
  try {
    const value = storage(kind)?.getItem(key) ?? null;
    return value === '' ? null : value;
  } catch {
    return null;
  }
}

function write(kind: 'session' | 'local', key: string, value: string): void {
  try {
    storage(kind)?.setItem(key, value);
  } catch {
    // A full or blocked storage: the choice lasts as long as the page.
  }
}

/**
 * Call `listener` with each value selected in the group `groupId`, until the returned function
 * runs. A tabs listens to its own group, and selects the value only if it has a tab for it.
 */
export function subscribeToTabGroup(groupId: string, listener: TabGroupListener): () => void {
  let listeners = groups.get(groupId);
  if (listeners === undefined) {
    listeners = new Set();
    groups.set(groupId, listeners);
  }
  const own = listeners;
  own.add(listener);
  return () => {
    own.delete(listener);
    if (own.size === 0 && groups.get(groupId) === own) {
      groups.delete(groupId);
    }
  };
}

/**
 * Select `value` in the group `groupId`, as a reader does in one of its tabs: every tabs of the
 * group hears of it, and the group stores it in `sessionStorage`, and with `persist` in
 * `localStorage` too.
 */
export function selectInTabGroup(groupId: string, value: string, persist: boolean): void {
  for (const listener of groups.get(groupId) ?? []) {
    listener(value);
  }
  write('session', groupId, value);
  if (persist) {
    write('local', groupId, value);
  }
}

/**
 * The value the group `groupId` remembers: the one selected in this session, or else, with
 * `persist`, on an earlier visit; `null` for none.
 */
export function readTabGroup(groupId: string, persist: boolean): string | null {
  return read('session', groupId) ?? (persist ? read('local', groupId) : null);
}
