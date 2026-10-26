/** The `localStorage` key that remembers a collapsed sidebar. */
const STORAGE_KEY = 'contour-docs-sidebar';

/**
 * The source of an inline script for `<head>`: it marks `<html>` with `data-sidebar="collapsed"`
 * before the first paint when the user left the sidebar collapsed, and CSS hides the sidebar from
 * that attribute. React never renders the state, so a reload neither flashes the sidebar nor
 * hydrates differently from the server's HTML.
 */
export const sidebarScript = `try{if(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})==='collapsed')document.documentElement.dataset.sidebar='collapsed'}catch{}`;

/** Collapse or expand the sidebar on wide screens, and remember the choice in `localStorage`. */
export function setSidebarCollapsed(collapsed: boolean): void {
  const { dataset } = document.documentElement;
  if (collapsed) {
    dataset['sidebar'] = 'collapsed';
  } else {
    delete dataset['sidebar'];
  }
  try {
    if (collapsed) {
      localStorage.setItem(STORAGE_KEY, 'collapsed');
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // The browser blocks the storage: the choice lasts as long as the page.
  }
}
