import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { docsScript } from './docs-script.ts';

const root = document.documentElement;

/** Run `source` as an inline script of the page, the way the browser runs `docsScript()`. */
function runInlineScript(source: string): void {
  const script = document.createElement('script');
  script.textContent = source;
  // An inline script runs as it is inserted.
  document.head.append(script);
  script.remove();
}

/** A `localStorage` that throws, as browsers do where storage is blocked. */
const BLOCKED_STORAGE = {
  getItem: (): never => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  delete root.dataset['theme'];
  delete root.dataset['contourDocsSidebar'];
});

describe('docsScript', () => {
  it('sets the stored theme, and marks a sidebar the user left collapsed', () => {
    localStorage.setItem('contour-theme', 'light');
    localStorage.setItem('contour-docs-sidebar', 'collapsed');
    runInlineScript(docsScript());

    expect(root.dataset['theme']).toBe('light');
    expect(root.dataset['contourDocsSidebar']).toBe('collapsed');
  });

  it('leaves the sidebar expanded with nothing stored', () => {
    runInlineScript(docsScript());

    expect(root.dataset['theme']).toMatch(/^(?:dark|light)$/u);
    expect(root.dataset['contourDocsSidebar']).toBeUndefined();
  });

  it('reads the keys of its options', () => {
    localStorage.setItem('contour-theme', 'light');
    localStorage.setItem('contour-docs-sidebar', 'collapsed');
    localStorage.setItem('app-theme', 'dark');
    runInlineScript(docsScript({ theme: { storageKey: 'app-theme' }, sidebarStorageKey: 'app' }));

    expect(root.dataset['theme']).toBe('dark');
    expect(root.dataset['contourDocsSidebar']).toBeUndefined();

    localStorage.setItem('app', 'collapsed');
    runInlineScript(docsScript({ sidebarStorageKey: 'app' }));
    expect(root.dataset['contourDocsSidebar']).toBe('collapsed');
  });

  it('applies the defaults where the browser blocks the storage', () => {
    vi.stubGlobal('localStorage', BLOCKED_STORAGE);
    runInlineScript(docsScript({ theme: { defaultTheme: 'light' } }));

    expect(root.dataset['theme']).toBe('light');
    expect(root.dataset['contourDocsSidebar']).toBeUndefined();
  });

  it('keeps a `</script>` in the sidebar key from ending the script element', () => {
    const sidebarStorageKey = '</script><script>alert(1)</script>';
    const source = docsScript({ sidebarStorageKey });
    const parsed = new DOMParser().parseFromString(`<script>${source}</script>`, 'text/html');

    expect(parsed.querySelectorAll('script')).toHaveLength(1);
    expect(parsed.querySelector('script')?.textContent).toBe(source);
    localStorage.setItem(sidebarStorageKey, 'collapsed');
    runInlineScript(source);
    expect(root.dataset['contourDocsSidebar']).toBe('collapsed');
  });
});
