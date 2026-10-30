import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';

import { DocsLayout, DocsPage } from '../index.ts';
import { pageTree } from '../test-utils/page-tree.ts';
import { renderDocs } from '../test-utils/render.tsx';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';
import '@contour-ui/react/styles.css';

/** A docs page in the layout of the fixtures' tree. */
function DocsSite(): ReactElement {
  return (
    <DocsLayout tree={pageTree}>
      <DocsPage title="Page" toc={[]}>
        <p>Content</p>
      </DocsPage>
    </DocsLayout>
  );
}

afterEach(async () => {
  // The default viewport of the browser tests.
  await page.viewport(414, 896);
});

describe('the section switcher', () => {
  it('shows the section of the page, and lists the sections with their descriptions', async () => {
    await page.viewport(1280, 800);
    await renderDocs(<DocsSite />, { pathname: '/docs/guide/installation' });
    const switcher = page.getByRole('button', { name: 'Guide', exact: true });
    await expect.element(switcher).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(switcher);
    const sections = page.getByRole('dialog', { name: 'Sections' });
    await expect.element(switcher).toHaveAttribute('aria-expanded', 'true');
    const guide = sections.getByRole('link', { name: 'Guide' });
    await expect.element(guide).toHaveAttribute('href', '/docs/guide');
    await expect.element(guide).toHaveAttribute('aria-current', 'true');
    // The description follows the name and the state, rather than joining the name.
    await expect.element(guide).toHaveAccessibleDescription('How it works and how to set it up');
    const essentials = sections.getByRole('link', { name: 'Essentials' });
    await expect.element(essentials).toHaveAttribute('href', '/docs/essentials');
    await expect.element(essentials).not.toHaveAttribute('aria-current');
  });

  it('goes to the section chosen through the framework, and then shows it', async () => {
    await page.viewport(1280, 800);
    const onNavigate = vi.fn<(url: string) => void>();
    await renderDocs(<DocsSite />, { pathname: '/docs/guide/installation', onNavigate });
    await userEvent.click(page.getByRole('button', { name: 'Guide', exact: true }));
    const sections = page.getByRole('dialog', { name: 'Sections' });

    await userEvent.click(sections.getByRole('link', { name: 'Essentials' }));
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('/docs/essentials');
    await expect.element(sections).not.toBeInTheDocument();
    // The switcher names the new section and has the focus back; the navigation lists its pages.
    await expect
      .element(page.getByRole('button', { name: 'Essentials', exact: true }))
      .toHaveFocus();
    await expect
      .element(
        page.getByRole('navigation', { name: 'Docs' }).getByRole('link', { name: 'Essentials' }),
      )
      .toHaveAttribute('aria-current', 'page');
  });

  it('closes the menu around it on a phone as well, and the focus goes to the menu button', async () => {
    await page.viewport(390, 844);
    const onNavigate = vi.fn<(url: string) => void>();
    await renderDocs(<DocsSite />, { pathname: '/docs/guide', onNavigate });
    const open = page.getByRole('button', { name: 'Open menu' });
    await userEvent.click(open);
    const menu = page.getByRole('dialog', { name: 'Menu' });

    await userEvent.click(menu.getByRole('button', { name: 'Guide', exact: true }));
    await userEvent.click(
      page.getByRole('dialog', { name: 'Sections' }).getByRole('link', { name: 'Essentials' }),
    );
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('/docs/essentials');
    // The popover closes with the click, the menu as the next page renders.
    await expect.element(menu).not.toBeInTheDocument();
    await expect.element(open).toHaveFocus();
  });
});
