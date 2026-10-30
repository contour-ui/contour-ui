import { beforeAll, describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';

import { DocsLayout, DocsPage, SearchTrigger } from '../index.ts';
import { PageContent } from '../test-utils/page-content.tsx';
import { pageTree } from '../test-utils/page-tree.ts';
import { renderDocs } from '../test-utils/render.tsx';
import { createSearchIndexUrl } from '../test-utils/search-index.ts';
import { toc } from '../test-utils/toc.ts';

/** The static search index of the fixtures. */
let from = '';

beforeAll(async () => {
  from = await createSearchIndexUrl();
});

const dialog = page.getByRole('dialog', { name: 'Search' });
const field = dialog.getByRole('combobox', { name: 'Search the docs' });

/** The page of Button at `pathname`, with its headings, and the search. */
async function renderButtonPage(
  pathname: string,
  onNavigate: (url: string) => void,
): Promise<void> {
  await renderDocs(
    <DocsLayout tree={pageTree}>
      <DocsPage title="Button" toc={toc}>
        <PageContent />
      </DocsPage>
    </DocsLayout>,
    { pathname, onNavigate, search: { from } },
  );
}

/** Open the search from the layout and search for `query`. */
async function search(query: string): Promise<void> {
  await userEvent.click(page.getByRole('button', { name: 'Search' }).first());
  await expect.element(field).toHaveFocus();
  await userEvent.fill(field, query);
}

describe('SearchTrigger', () => {
  it('opens the search, and Escape gives the focus back to it', async () => {
    await renderDocs(<SearchTrigger />, { search: { from } });
    const trigger = page.getByRole('button', { name: 'Search' });

    await expect.element(trigger).toHaveAttribute('aria-keyshortcuts');
    expect(trigger.element().getAttribute('aria-keyshortcuts')).toMatch(/^(?:Meta|Control)\+K$/u);
    await userEvent.click(trigger);
    await expect.element(field).toHaveFocus();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');

    await userEvent.keyboard('{Escape}');
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  it('renders nothing on a site without search', async () => {
    const { container } = await renderDocs(<SearchTrigger />);

    expect(container.childElementCount).toBe(0);
  });
});

describe('a result', () => {
  it('on another page goes there through the framework, and takes the focus there', async () => {
    const onNavigate = vi.fn<(url: string) => void>();
    await renderButtonPage('/docs/essentials', onNavigate);
    await search('label');
    await userEvent.click(dialog.getByRole('option', { name: /give it a label/u }));

    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('/docs/essentials/button#usage');
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(page.getByRole('heading', { level: 2, name: 'Usage' })).toHaveFocus();
  });

  it('on the page goes to its heading, and moves the focus there', async () => {
    const onNavigate = vi.fn<(url: string) => void>();
    await renderButtonPage('/docs/essentials/button', onNavigate);
    await search('label');
    await userEvent.click(dialog.getByRole('option', { name: /give it a label/u }));

    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('/docs/essentials/button#usage');
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(page.getByRole('heading', { level: 2, name: 'Usage' })).toHaveFocus();
  });

  it('at the address of the page stays there, and moves the focus to the page', async () => {
    const onNavigate = vi.fn<(url: string) => void>();
    await renderButtonPage('/docs/essentials/button', onNavigate);
    await search('button');
    // The page itself: no heading, and the test page has no `#hash`.
    await userEvent.click(dialog.getByRole('option', { name: /^Button/u }).first());

    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(page.getByRole('main')).toHaveFocus();
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
