import { useRouter } from 'fumadocs-core/framework';
import type { Router } from 'fumadocs-core/framework';
import { createRef, useImperativeHandle } from 'react';
import type { ReactElement, Ref } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';

import { DocsLayout, DocsPage } from '../index.ts';
import { pageTree } from '../test-utils/page-tree.ts';
import { renderDocs } from '../test-utils/render.tsx';

const root = document.documentElement;

/** A docs page of the test tree, and the router of the framework in `router`. */
function Docs({ router }: { readonly router?: Ref<Router> | undefined }): ReactElement {
  const framework = useRouter();
  useImperativeHandle(router, () => framework, [framework]);
  return (
    <DocsLayout tree={pageTree}>
      <DocsPage title="Page" toc={[]}>
        <p>Content</p>
      </DocsPage>
    </DocsLayout>
  );
}

/**
 * Click `link` with `init` and tell whether its router took it. The click is canceled after
 * that in any case, so the browser never follows the link out of the test.
 */
function isClickHandled(link: Element, init: MouseEventInit = {}): boolean {
  let handled = false;
  const listener = (event: Event): void => {
    handled = event.defaultPrevented;
    event.preventDefault();
  };
  // The window hears the click last, after React's handlers on the root.
  window.addEventListener('click', listener);
  link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
  window.removeEventListener('click', listener);
  return handled;
}

afterEach(() => {
  localStorage.clear();
  delete root.dataset['contourDocsSidebar'];
});

describe('DocsLayout', () => {
  it('lists the pages of the section of the pathname, and marks the page', async () => {
    await renderDocs(<Docs />, { pathname: '/docs/guide/installation' });
    const docs = page.getByRole('navigation', { name: 'Docs' });

    await expect
      .element(docs.getByRole('link', { name: 'Installation' }))
      .toHaveAttribute('aria-current', 'page');
    await expect
      .element(docs.getByRole('link', { name: 'Themes' }))
      .not.toHaveAttribute('aria-current');
    await expect.element(docs.getByRole('link', { name: 'Button' })).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Guide', exact: true })).toBeVisible();
  });

  it('lists the whole tree on a page outside the sections', async () => {
    await renderDocs(<Docs />, { pathname: '/docs' });
    const docs = page.getByRole('navigation', { name: 'Docs' });

    await expect
      .element(docs.getByRole('link', { name: 'Introduction' }))
      .toHaveAttribute('aria-current', 'page');
    await expect
      .element(docs.getByRole('link', { name: 'Kit', exact: true }))
      .toHaveAttribute('href', '/docs/kit');
    await expect.element(page.getByRole('button', { name: 'Sections' })).toBeVisible();
  });

  it('marks the page of a pathname with a trailing slash', async () => {
    await renderDocs(<Docs />, { pathname: '/docs/guide/installation/' });

    await expect
      .element(
        page.getByRole('navigation', { name: 'Docs' }).getByRole('link', { name: 'Installation' }),
      )
      .toHaveAttribute('aria-current', 'page');
  });

  it('goes to another page through the framework, and follows its pathname', async () => {
    const onNavigate = vi.fn<(url: string) => void>();
    await renderDocs(<Docs />, { pathname: '/docs/guide/installation', onNavigate });
    const docs = page.getByRole('navigation', { name: 'Docs' });
    const themes = docs.getByRole('link', { name: 'Themes' });

    expect(isClickHandled(themes.element())).toBe(true);
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('/docs/guide/themes');
    await expect.element(themes).toHaveAttribute('aria-current', 'page');
    await expect
      .element(docs.getByRole('link', { name: 'Installation' }))
      .not.toHaveAttribute('aria-current');
  });

  it('collapses the sidebar, remembers it, and moves the focus to the button that undoes it', async () => {
    await renderDocs(<Docs />, { pathname: '/docs/guide', sidebarStorageKey: 'app-sidebar' });
    const collapse = page.getByRole('button', { name: 'Collapse sidebar' });
    const expand = page.getByRole('button', { name: 'Expand sidebar' });

    await userEvent.click(collapse);
    expect(root.dataset['contourDocsSidebar']).toBe('collapsed');
    expect(localStorage.getItem('app-sidebar')).toBe('collapsed');
    await expect.element(expand).toHaveFocus();

    await userEvent.click(expand);
    expect(root.dataset['contourDocsSidebar']).toBeUndefined();
    expect(localStorage.getItem('app-sidebar')).toBeNull();
    await expect.element(collapse).toHaveFocus();
  });

  it('starts with the skip link to the page', async () => {
    await renderDocs(<Docs />, { pathname: '/docs/guide' });
    const skip = page.getByRole('link', { name: 'Skip to content' });

    await expect.element(skip).toHaveAttribute('href', '#content');
    expect(document.querySelector('a[href], button')).toBe(skip.element());
    await expect.element(page.getByRole('main')).toHaveAttribute('id', 'content');
  });
});

describe('the menu', () => {
  it('closes as a link in it is followed, a link to the page itself included', async () => {
    const onNavigate = vi.fn<(url: string) => void>();
    await renderDocs(<Docs />, { pathname: '/docs/guide/installation', onNavigate });
    const open = page.getByRole('button', { name: 'Open menu' });
    const menu = page.getByRole('dialog', { name: 'Menu' });

    await userEvent.click(open);
    await userEvent.click(menu.getByRole('link', { name: 'Installation' }));
    await expect.element(menu).not.toBeInTheDocument();
    expect(onNavigate).toHaveBeenLastCalledWith('/docs/guide/installation');

    await userEvent.click(open);
    await userEvent.click(menu.getByRole('link', { name: 'Themes' }));
    await expect.element(menu).not.toBeInTheDocument();
    expect(onNavigate).toHaveBeenLastCalledWith('/docs/guide/themes');
  });

  it('stays open for a link that opens elsewhere', async () => {
    const onNavigate = vi.fn<(url: string) => void>();
    await renderDocs(<Docs />, { pathname: '/docs/guide', onNavigate });
    await userEvent.click(page.getByRole('button', { name: 'Open menu' }));
    const menu = page.getByRole('dialog', { name: 'Menu' });
    await expect.element(menu).toBeVisible();

    const themes = menu.getByRole('link', { name: 'Themes' }).element();
    expect(isClickHandled(themes, { metaKey: true })).toBe(false);
    expect(isClickHandled(themes, { ctrlKey: true })).toBe(false);
    const github = menu.getByRole('link', { name: 'GitHub (opens in a new tab)' }).element();
    expect(isClickHandled(github)).toBe(false);

    await expect.element(menu).toBeVisible();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('leaves a section chosen in the switcher to the pathname, and then gives the focus back to the menu button', async () => {
    const router = createRef<Router>();
    await renderDocs(<Docs router={router} />, { pathname: '/docs/kit' });
    const open = page.getByRole('button', { name: 'Open menu' });
    await userEvent.click(open);
    const menu = page.getByRole('dialog', { name: 'Menu' });
    const switcher = menu.getByRole('button', { name: 'Kit', exact: true });
    await userEvent.click(switcher);
    const sections = page.getByRole('dialog', { name: 'Sections' });

    // The section of the page: the pathname stays, the popover closes, and the menu stays.
    await userEvent.click(sections.getByRole('link', { name: 'Kit', exact: true }));
    await expect.element(sections).not.toBeInTheDocument();
    await expect.element(switcher).toHaveFocus();
    await expect.element(menu).toBeVisible();

    // A router shows the section later than the click: the menu closes then, from the switcher.
    await router.current?.push('/docs/guide');
    await expect.element(menu).not.toBeInTheDocument();
    await expect.element(open).toHaveFocus();
  });

  it('closes as the framework goes to another page', async () => {
    const router = createRef<Router>();
    await renderDocs(<Docs router={router} />, { pathname: '/docs/guide' });
    await userEvent.click(page.getByRole('button', { name: 'Open menu' }));
    const menu = page.getByRole('dialog', { name: 'Menu' });
    await expect.element(menu).toBeVisible();

    await router.current?.push('/docs/guide/themes');
    await expect.element(menu).not.toBeInTheDocument();
  });
});
