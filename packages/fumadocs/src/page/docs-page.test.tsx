import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';

import { DocsLayout, DocsPage } from '../index.ts';
import { pageTree } from '../test-utils/page-tree.ts';
import { renderDocs } from '../test-utils/render.tsx';
import { toc } from '../test-utils/toc.ts';

/** The `h2` and `h3` headings of the table of contents of the fixtures: title and link. */
const LISTED = toc.filter(({ depth }) => depth <= 3).map(({ title, url }) => [title, url]);

describe('DocsPage', () => {
  it('heads the page in `main#content` with its title and description', async () => {
    await renderDocs(
      <DocsLayout tree={pageTree}>
        <DocsPage title="Installation" description="Add the packages." toc={[]}>
          <p>Content</p>
        </DocsPage>
      </DocsLayout>,
      { pathname: '/docs/guide/installation' },
    );
    const main = page.getByRole('main');

    await expect.element(main).toHaveAttribute('id', 'content');
    await expect.element(main.getByRole('heading', { level: 1 })).toHaveTextContent('Installation');
    await expect.element(main.getByText('Add the packages.')).toBeVisible();
  });

  it('links to its neighbours in the tree, found by the pathname, with a trailing slash too', async () => {
    await renderDocs(
      <DocsLayout tree={pageTree}>
        <DocsPage title="Installation" toc={[]}>
          <p>Content</p>
        </DocsPage>
      </DocsLayout>,
      { pathname: '/docs/guide/installation/' },
    );
    const neighbours = page.getByRole('navigation', { name: 'Previous and next page' });

    await expect
      .element(neighbours.getByRole('link', { name: /^Previous/u }))
      .toHaveAttribute('href', '/docs/guide');
    await expect
      .element(neighbours.getByRole('link', { name: /^Next/u }))
      .toHaveAttribute('href', '/docs/guide/themes');
  });

  it('lists the `h2` and `h3` headings of its table of contents', async () => {
    await renderDocs(
      <DocsLayout tree={pageTree}>
        <DocsPage title="Button" toc={toc}>
          <p>Content</p>
        </DocsPage>
      </DocsLayout>,
      { pathname: '/docs/essentials/button' },
    );
    const column = page.getByRole('navigation', { name: 'On this page' });
    await expect.element(column).toBeVisible();

    const links = column
      .getByRole('link')
      .elements()
      .map((link) => [link.textContent, link.getAttribute('href')]);
    expect(links).toStrictEqual(LISTED);
    await expect.element(page.getByRole('button', { name: /^On this page/u })).toBeVisible();
  });

  it('asks for a DocsLayout around it', () => {
    expect(() =>
      renderToString(
        <DocsPage title="Page" toc={[]}>
          <p>Content</p>
        </DocsPage>,
      ),
    ).toThrow('DocsPage: render it inside <DocsLayout>.');
  });
});
