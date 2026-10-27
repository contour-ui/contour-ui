/** The default `localStorage` key that remembers a collapsed sidebar. */
export const DEFAULT_SIDEBAR_STORAGE_KEY = 'contour-docs-sidebar';

/**
 * `value` as a JavaScript literal that is safe inside an HTML `<script>`: its JSON, with every `<`
 * escaped, so no `</script>` in a string ends the element early.
 */
function literal(value: string): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

/**
 * The source of an inline script for `<head>`: it marks `<html>` with
 * `data-contour-docs-sidebar="collapsed"` before the first paint when the user left the sidebar
 * collapsed, and CSS hides the sidebar from that attribute. React never renders the state, so a
 * reload neither flashes the sidebar nor hydrates differently from the server's HTML.
 */
export function sidebarScript(storageKey: string): string {
  return `try{if(localStorage.getItem(${literal(storageKey)})==='collapsed')document.documentElement.dataset.contourDocsSidebar='collapsed'}catch{}`;
}

/**
 * Collapse or expand the sidebar on wide screens, and remember the choice in `localStorage`
 * under `storageKey`.
 */
export function setSidebarCollapsed(collapsed: boolean, storageKey: string): void {
  const { dataset } = document.documentElement;
  if (collapsed) {
    dataset['contourDocsSidebar'] = 'collapsed';
  } else {
    delete dataset['contourDocsSidebar'];
  }
  try {
    if (collapsed) {
      localStorage.setItem(storageKey, 'collapsed');
    } else {
      localStorage.removeItem(storageKey);
    }
  } catch {
    // The browser blocks the storage: the choice lasts as long as the page.
  }
}
