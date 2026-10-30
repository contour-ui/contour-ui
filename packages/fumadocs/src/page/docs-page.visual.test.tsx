import type { ReactElement } from 'react';
import { page, userEvent } from 'vite-plus/test/browser';
import type { Locator } from 'vite-plus/test/browser';

import { DocsLayout, DocsPage } from '../index.ts';
import { Prose } from '../mdx/index.ts';
import { PageContent } from '../test-utils/page-content.tsx';
import { pageTree } from '../test-utils/page-tree.ts';
import { toc } from '../test-utils/toc.ts';
import { visualStates } from '../test-utils/visual.tsx';

/** The page of Button in the layout: its long content, and the headings of its table of contents. */
function ButtonPage(): ReactElement {
  return (
    <DocsLayout tree={pageTree}>
      <DocsPage title="Button" description="A button that runs an action." toc={toc}>
        <PageContent />
      </DocsPage>
    </DocsLayout>
  );
}

/**
 * Press the button of `locator` from the keyboard, where the story clicked it: the focus it moves
 * shows its ring, as the story's synthetic click left it, and the pointer hovers nothing.
 */
async function press(locator: Locator): Promise<void> {
  locator.element().focus();
  await userEvent.keyboard('{Enter}');
}

visualStates({
  // From 80rem, the table of contents is a column beside the article.
  'toc-column': { render: () => <ButtonPage />, padded: false },
  // Below 80rem, it is a bar that sticks above the article.
  'toc-bar': { render: () => <ButtonPage />, padded: false, phone: true },
  // The bar opens the list in a popover, the link of the heading being read focused.
  'toc-popover': {
    render: () => <ButtonPage />,
    padded: false,
    phone: true,
    target: 'page',
    ready: async () => {
      await press(page.getByRole('button', { name: /^On this page/u }));
    },
    focused: () =>
      page.getByRole('dialog', { name: 'On this page' }).getByRole('link', { name: 'Usage' }),
  },
  // A page without headings has no table of contents, neither a bar nor a column.
  'without-toc': {
    render: () => (
      <DocsLayout tree={pageTree}>
        <DocsPage title="Dialog" description="A window over the page." toc={[]}>
          <Prose>
            <p>A dialog asks for the attention of the user, over the page.</p>
          </Prose>
        </DocsPage>
      </DocsLayout>
    ),
    params: { pathname: '/docs/essentials/dialog' },
    padded: false,
  },
  // The first page of a section links to the next one only.
  'first-page-of-section': {
    render: () => (
      <DocsLayout tree={pageTree}>
        <DocsPage title="Guide" description="How it works and how to set it up." toc={[]}>
          <Prose>
            <p>The guide shows how the packages fit together.</p>
          </Prose>
        </DocsPage>
      </DocsLayout>
    ),
    params: { pathname: '/docs/guide' },
    padded: false,
  },
  // The last page of a section links to the previous one only.
  'last-page-of-section': {
    render: () => (
      <DocsLayout tree={pageTree}>
        <DocsPage title="Plain CSS" description="Styles without the components." toc={[]}>
          <Prose>
            <p>The tokens work in plain CSS too.</p>
          </Prose>
        </DocsPage>
      </DocsLayout>
    ),
    params: { pathname: '/docs/guide/css' },
    padded: false,
  },
});
