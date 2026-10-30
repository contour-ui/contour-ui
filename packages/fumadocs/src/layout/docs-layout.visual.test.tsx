import type { ReactElement } from 'react';
import { page, userEvent } from 'vite-plus/test/browser';
import type { Locator } from 'vite-plus/test/browser';

import { DocsLayout, DocsPage } from '../index.ts';
import { Prose } from '../mdx/index.ts';
import { PageContent } from '../test-utils/page-content.tsx';
import { pageTree } from '../test-utils/page-tree.ts';
import { toc } from '../test-utils/toc.ts';
import { visualStates } from '../test-utils/visual.tsx';

/** The page of Button in the layout, with its long content and table of contents. */
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
 * The page of Button without its long content: a screenshot of an overlay with a backdrop over it
 * stays one viewport high, where the backdrop covers it all.
 */
function ShortPage(): ReactElement {
  return (
    <DocsPage title="Button" description="A button that runs an action." toc={[]}>
      <Prose>
        <p>A button runs an action where it is: it saves, sends or opens something.</p>
      </Prose>
    </DocsPage>
  );
}

/**
 * Press the button of `locator` from the keyboard rather than click it: the focus it moves shows
 * its ring, and the pointer hovers nothing.
 */
async function press(locator: Locator): Promise<void> {
  locator.element().focus();
  await userEvent.keyboard('{Enter}');
}

visualStates({
  // At 1280px: the sidebar, the page and the column of its table of contents.
  desktop: { render: () => <ButtonPage />, padded: false },
  // At 390px: the header, the bar of the table of contents, then the page.
  phone: { render: () => <ButtonPage />, padded: false, phone: true },
  // The menu on a phone: the drawer with the section switcher, the pages and the links of the site.
  'phone-menu': {
    render: () => (
      <DocsLayout tree={pageTree}>
        <ShortPage />
      </DocsLayout>
    ),
    padded: false,
    phone: true,
    target: 'page',
    ready: async () => {
      await press(page.getByRole('button', { name: 'Open menu' }));
    },
    // Focus moves to the x as the drawer opens.
    focused: () => page.getByRole('button', { name: 'Close menu' }),
  },
  // The section switcher open: the sections with their descriptions, the current one checked.
  'section-switcher': {
    render: () => <ButtonPage />,
    padded: false,
    target: 'page',
    ready: async () => {
      await press(page.getByRole('button', { name: 'Essentials', exact: true }));
    },
    // Focus moves to the first section as the popover opens.
    focused: () =>
      page.getByRole('dialog', { name: 'Sections' }).getByRole('link', { name: 'Guide' }),
  },
  // The sidebar collapsed: the toolbar with the button that expands it and the search.
  'collapsed-sidebar': {
    render: () => <ButtonPage />,
    padded: false,
    ready: async () => {
      await press(page.getByRole('button', { name: 'Collapse sidebar' }));
    },
    focused: () => page.getByRole('button', { name: 'Expand sidebar' }),
  },
  // A page in a folder of its section: the folder open, the page marked in it.
  'nested-page': {
    render: () => (
      <DocsLayout tree={pageTree}>
        <DocsPage title="Checkbox" description="A choice that is on or off." toc={[]}>
          <p>A checkbox sets one option on or off.</p>
        </DocsPage>
      </DocsLayout>
    ),
    params: { pathname: '/docs/essentials/forms/checkbox' },
    padded: false,
  },
  // The three-way theme toggle at the foot of the sidebar.
  'light-dark-system-theme': {
    render: () => (
      <DocsLayout tree={pageTree}>
        <ShortPage />
      </DocsLayout>
    ),
    params: { themeToggle: 'light-dark-system' },
    padded: false,
  },
  // A page outside the sections: the switcher says "Sections", the navigation lists them.
  'outside-the-sections': {
    render: () => (
      <DocsLayout tree={pageTree}>
        <DocsPage title="Introduction" description="What the docs cover." toc={[]}>
          <p>Start with the guide, or go to the components.</p>
        </DocsPage>
      </DocsLayout>
    ),
    params: { pathname: '/docs' },
    padded: false,
  },
});
