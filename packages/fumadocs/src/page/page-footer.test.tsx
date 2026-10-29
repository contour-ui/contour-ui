import type { Root } from 'fumadocs-core/page-tree';
import { describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { MemoryFramework } from '../test-utils/framework.tsx';
import { pageTree } from '../test-utils/page-tree.ts';
import { PageFooter } from './page-footer.tsx';

// The label and the title are blocks with the styles, which keeps them apart in the name.
import '@contour-ui/tokens/tokens.css';
import '../styles.css';
import '@contour-ui/react/styles.css';

const neighbours = page.getByRole('navigation', { name: 'Previous and next page' });
const previousLink = neighbours.getByRole('link', { name: /^Previous/u });
const nextLink = neighbours.getByRole('link', { name: /^Next/u });

/** The footer of the page at `url` in the fixtures' tree. */
async function renderFooter(url: string, tree: Root = pageTree): Promise<void> {
  await render(
    <MemoryFramework pathname={url}>
      <PageFooter tree={tree} url={url} />
    </MemoryFramework>,
  );
}

describe('PageFooter', () => {
  it('links the first page of a section to the next one only', async () => {
    await renderFooter('/docs/guide');

    await expect.element(nextLink).toHaveAccessibleName('Next Installation');
    await expect.element(nextLink).toHaveAttribute('href', '/docs/guide/installation');
    await expect.element(nextLink).toHaveAttribute('rel', 'next');
    await expect.element(previousLink).not.toBeInTheDocument();
  });

  it('links the last page of a section to the previous one only', async () => {
    await renderFooter('/docs/guide/css');

    await expect.element(previousLink).toHaveAccessibleName('Previous Tokens');
    await expect.element(previousLink).toHaveAttribute('href', '/docs/guide/tokens');
    await expect.element(previousLink).toHaveAttribute('rel', 'prev');
    await expect.element(nextLink).not.toBeInTheDocument();
  });

  it('follows the order of the sidebar, across separators and into folders', async () => {
    await renderFooter('/docs/guide/tokens');
    // Past the separator "Styling".
    await expect.element(previousLink).toHaveAttribute('href', '/docs/guide/themes');
    await expect.element(nextLink).toHaveAttribute('href', '/docs/guide/css');
  });

  it('goes into a folder by its index page, and on to its pages', async () => {
    await renderFooter('/docs/kit/forms');

    await expect.element(previousLink).toHaveAttribute('href', '/docs/kit/dialog');
    await expect.element(nextLink).toHaveAttribute('href', '/docs/kit/forms/checkbox');
  });

  it('keeps to the section of the page', async () => {
    await renderFooter('/docs/kit');

    // Not the last page of Guide, the section before.
    await expect.element(previousLink).not.toBeInTheDocument();
    await expect.element(nextLink).toHaveAttribute('href', '/docs/kit/button');
  });

  it('renders nothing for a page alone in its section', async () => {
    const tree: Root = {
      $id: 'root',
      name: 'Docs',
      children: [
        {
          $id: 'changelog',
          type: 'folder',
          name: 'Changelog',
          root: true,
          children: [{ $id: 'changelog/index.mdx', type: 'page', name: 'Changelog', url: '/log' }],
        },
      ],
    };
    await renderFooter('/log', tree);

    await expect.element(neighbours).not.toBeInTheDocument();
  });

  it('goes to a neighbour through the framework', async () => {
    const onNavigate = vi.fn<(url: string) => void>();
    await render(
      <MemoryFramework pathname="/docs/kit/button" onNavigate={onNavigate}>
        <PageFooter tree={pageTree} url="/docs/kit/button" />
      </MemoryFramework>,
    );

    await expect.element(nextLink).toHaveAttribute('data-framework-link');
    await userEvent.click(nextLink);
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('/docs/kit/dialog');
  });
});
