import { useLayoutEffect } from 'react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';

import { DocsLayout, DocsPage, docsScript } from '../index.ts';
import { pageTree } from '../test-utils/page-tree.ts';
import { renderDocs } from '../test-utils/render.tsx';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';
import '@contour-ui/kit/styles.css';

const root = document.documentElement;

/** Run `source` as an inline script of the page, the way the browser runs `docsScript()`. */
function runInlineScript(source: string): void {
  const script = document.createElement('script');
  script.textContent = source;
  // An inline script runs as it is inserted.
  document.head.append(script);
  script.remove();
}

/** Whether the element of `selector` takes room on the page: not `display: none`, itself or above. */
function isRendered(selector: string): boolean {
  const element = document.querySelector(selector);
  return element !== null && element.getClientRects().length > 0;
}

interface FirstCommitProps {
  /** Called once, as React commits the first render, before the browser paints it. */
  readonly onCommit: () => void;
}

function FirstCommit({ onCommit }: FirstCommitProps): null {
  useLayoutEffect(() => {
    onCommit();
  }, [onCommit]);
  return null;
}

afterEach(async () => {
  localStorage.clear();
  delete root.dataset['contourDocsSidebar'];
  delete root.dataset['theme'];
  // The default viewport of the browser tests.
  await page.viewport(414, 896);
});

describe('the sidebar', () => {
  it('starts collapsed, from its first paint, where docsScript() found it collapsed', async () => {
    await page.viewport(1280, 800);
    localStorage.setItem('contour-docs-sidebar', 'collapsed');
    runInlineScript(docsScript());

    // What the page shows before the browser first paints it: the toolbar, not the panel.
    let firstPaint: { readonly panel: boolean; readonly toolbar: boolean } | undefined;
    const DocsSite = (): ReactElement => (
      <DocsLayout tree={pageTree}>
        <DocsPage title="Page" toc={[]}>
          <FirstCommit
            onCommit={() => {
              firstPaint ??= {
                panel: isRendered('.contour-docs-sidebar__panel'),
                toolbar: isRendered('.contour-docs-sidebar__toolbar'),
              };
            }}
          />
          <p>Content</p>
        </DocsPage>
      </DocsLayout>
    );
    await renderDocs(<DocsSite />, { pathname: '/docs/guide' });
    expect(firstPaint).toStrictEqual({ panel: false, toolbar: true });

    await expect.element(page.getByRole('navigation', { name: 'Docs' })).not.toBeInTheDocument();
    await userEvent.click(page.getByRole('button', { name: 'Expand sidebar' }));
    await expect.element(page.getByRole('navigation', { name: 'Docs' })).toBeVisible();
    expect(root.dataset['contourDocsSidebar']).toBeUndefined();
    expect(localStorage.getItem('contour-docs-sidebar')).toBeNull();
  });

  it('takes the collapsed state from the key the provider and the script share', async () => {
    await page.viewport(1280, 800);
    localStorage.setItem('docs-nav', 'collapsed');
    runInlineScript(docsScript({ sidebarStorageKey: 'docs-nav' }));
    await renderDocs(
      <DocsLayout tree={pageTree}>
        <DocsPage title="Page" toc={[]}>
          <p>Content</p>
        </DocsPage>
      </DocsLayout>,
      { pathname: '/docs/guide', sidebarStorageKey: 'docs-nav' },
    );
    const expand = page.getByRole('button', { name: 'Expand sidebar' });

    await userEvent.click(expand);
    expect(localStorage.getItem('docs-nav')).toBeNull();
    await userEvent.click(page.getByRole('button', { name: 'Collapse sidebar' }));
    expect(localStorage.getItem('docs-nav')).toBe('collapsed');
    expect(localStorage.getItem('contour-docs-sidebar')).toBeNull();
    await expect.element(expand).toHaveFocus();
  });

  it('is left out below 48rem, where the header and its menu take over', async () => {
    localStorage.setItem('contour-docs-sidebar', 'collapsed');
    runInlineScript(docsScript());
    await renderDocs(
      <DocsLayout tree={pageTree}>
        <DocsPage title="Page" toc={[]}>
          <p>Content</p>
        </DocsPage>
      </DocsLayout>,
      { pathname: '/docs/guide' },
    );

    // A collapsed sidebar changes nothing on a phone: neither the panel nor its toolbar shows.
    await expect.element(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
    expect(isRendered('.contour-docs-sidebar__panel')).toBe(false);
    expect(isRendered('.contour-docs-sidebar__toolbar')).toBe(false);
  });
});
