import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { Locator } from 'vite-plus/test/browser';

import { DocsLayout, DocsPage } from '../index.ts';
import { PageContent } from '../test-utils/page-content.tsx';
import { pageTree } from '../test-utils/page-tree.ts';
import { renderDocs } from '../test-utils/render.tsx';
import { toc } from '../test-utils/toc.ts';

// The bar and the column of the table of contents take turns by the width of the viewport.
import '@contour-ui/tokens/tokens.css';
import '../styles.css';
import '@contour-ui/react/styles.css';

/** The `h2` and `h3` headings of the table of contents of the fixtures: title and link. */
const LISTED = toc.filter(({ depth }) => depth <= 3).map(({ title, url }) => [title, url]);

/** The column of the table of contents, from 80rem. */
const column = page.getByRole('navigation', { name: 'On this page' });
/** The bar of the table of contents, below 80rem. */
const bar = page.getByRole('button', { name: /^On this page/u });

/** The title and the link of each link in `list`. */
const linksOf = (list: Locator): Array<[string | null, string | null]> =>
  list
    .getByRole('link')
    .elements()
    .map((link) => [link.textContent, link.getAttribute('href')]);

/** The page of Button, with its content and the headings of its table of contents. */
async function renderButtonPage(): Promise<void> {
  await renderDocs(
    <DocsLayout tree={pageTree}>
      <DocsPage title="Button" description="A button that runs an action." toc={toc}>
        <PageContent />
      </DocsPage>
    </DocsLayout>,
    { pathname: '/docs/essentials/button' },
  );
}

afterEach(async () => {
  // The default viewport of the browser tests.
  await page.viewport(414, 896);
});

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

  it('lists the `h2` and `h3` headings of its table of contents in a column from 80rem', async () => {
    await page.viewport(1280, 800);
    await renderButtonPage();
    await expect.element(column).toBeVisible();

    expect(linksOf(column)).toStrictEqual(LISTED);
    // In place of the bar.
    await expect.element(bar).not.toBeInTheDocument();
  });

  it('lists them below 80rem in the popover of a bar, focused at the heading being read', async () => {
    await page.viewport(390, 844);
    await renderButtonPage();
    await expect.element(bar).toBeVisible();
    await expect.element(column).not.toBeInTheDocument();

    await userEvent.click(bar);
    const popover = page.getByRole('dialog', { name: 'On this page' });
    // The first heading, at the top of the page.
    await expect.element(popover.getByRole('link', { name: 'Usage' })).toHaveFocus();
    expect(linksOf(popover)).toStrictEqual(LISTED);
  });

  it('has no table of contents without headings, and keeps its footer at the bottom', async () => {
    await page.viewport(390, 844);
    await renderDocs(
      <DocsLayout tree={pageTree}>
        <DocsPage title="Dialog" description="A window over the page." toc={[]}>
          <p>A dialog asks for the attention of the user, over the page.</p>
        </DocsPage>
      </DocsLayout>,
      { pathname: '/docs/essentials/dialog' },
    );
    const footer = page.getByRole('navigation', { name: 'Previous and next page' });
    await expect.element(footer).toBeVisible();
    await expect.element(bar).not.toBeInTheDocument();

    await page.viewport(1280, 720);
    await expect.element(column).not.toBeInTheDocument();
    // A short page: the links to the neighbours sit at the bottom of the viewport.
    expect(footer.element().getBoundingClientRect().bottom).toBeGreaterThan(
      window.innerHeight * 0.75,
    );
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
