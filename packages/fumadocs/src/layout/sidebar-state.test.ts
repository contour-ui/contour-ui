import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { setSidebarCollapsed } from './sidebar-state.ts';

const root = document.documentElement;

/** A method of `localStorage` where the browser blocks the storage. */
function blocked(): never {
  throw new DOMException('The operation is insecure.', 'SecurityError');
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  delete root.dataset['contourDocsSidebar'];
});

describe('setSidebarCollapsed', () => {
  it('marks `<html>` and remembers the choice under its key', () => {
    setSidebarCollapsed(true, 'app-sidebar');
    expect(root.dataset['contourDocsSidebar']).toBe('collapsed');
    expect(localStorage.getItem('app-sidebar')).toBe('collapsed');

    setSidebarCollapsed(false, 'app-sidebar');
    expect(root.dataset['contourDocsSidebar']).toBeUndefined();
    expect(localStorage.getItem('app-sidebar')).toBeNull();
  });

  it('keeps the choice for the page where the browser blocks the storage', () => {
    vi.stubGlobal('localStorage', { setItem: blocked, removeItem: blocked });

    setSidebarCollapsed(true, 'app-sidebar');
    expect(root.dataset['contourDocsSidebar']).toBe('collapsed');
    setSidebarCollapsed(false, 'app-sidebar');
    expect(root.dataset['contourDocsSidebar']).toBeUndefined();
  });
});
