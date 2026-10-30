import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactElement } from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { DocsLayout, DocsPage } from '../index.ts';
import { Prose } from '../mdx/index.ts';
import { PageContent } from '../test-utils/page-content.tsx';
import { pageTree } from '../test-utils/page-tree.ts';
import { toc } from '../test-utils/toc.ts';

/**
 * The layout of the docs pages around a `DocsPage`: the navigation of the page's section, in the
 * sidebar from 48rem and in the menu of the header below. The page here is Button, in the
 * Essentials section of the fixtures' page tree.
 */
const meta: Meta<typeof DocsLayout> = {
  title: 'Fumadocs/DocsLayout',
  component: DocsLayout,
  args: { tree: pageTree },
  render: ({ tree }) => (
    <DocsLayout tree={tree}>
      <DocsPage title="Button" description="A button that runs an action." toc={toc}>
        <PageContent />
      </DocsPage>
    </DocsLayout>
  ),
  // A page fills the viewport, edge to edge.
  parameters: { pathname: '/docs/essentials/button', canvasPadding: false },
  globals: { viewport: { value: 'desktop' } },
};

export default meta;

type Story = StoryObj<typeof meta>;

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

/** Wait until the dialog named `name` has the focus inside it, as it does once open. */
async function focusedIn(name: string): Promise<HTMLElement> {
  const overlay = await screen.findByRole('dialog', { name });
  await waitFor(async () => {
    await expect(overlay.contains(document.activeElement)).toBe(true);
  });
  return overlay;
}

/**
 * At 1280px: the sidebar with the brand, the search, the section switcher, the pages of the
 * section with the current one marked, and the links of the site; the page, and the column of
 * its table of contents.
 */
export const Desktop: Story = {
  play: async ({ canvas }) => {
    // The section switcher.
    await expect(canvas.getByRole('button', { name: 'Essentials' })).toBeVisible();
    const docs = canvas.getByRole('navigation', { name: 'Docs' });
    await expect(within(docs).getByRole('link', { name: 'Button' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    // The folder Forms holds another page: closed, its toggle after the link to its index page.
    await expect(within(docs).getByRole('button', { name: 'Forms pages' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(canvas.getByRole('heading', { level: 1, name: 'Button' })).toBeVisible();
    // The column of the table of contents, in place of its bar.
    await expect(canvas.getByRole('navigation', { name: 'On this page' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /^On this page/u })).toBeNull();
  },
};

/**
 * At 390px: the header with the brand, the search and the menu button, the bar of the table of
 * contents, then the page. The sidebar is gone.
 */
export const Phone: Story = {
  // A phone: the viewport of the canvas and the story tests, the tag of the screenshot tests.
  globals: { viewport: { value: 'phone' } },
  tags: ['phone'],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Open menu' })).toBeVisible();
    await expect(canvas.queryByRole('navigation', { name: 'Docs' })).toBeNull();
    await expect(canvas.getByRole('button', { name: /^On this page/u })).toBeVisible();
  },
};

/**
 * The menu on a phone: a drawer from the start edge with the section switcher, the pages of the
 * section and, at the bottom, the links of the site and the theme toggle.
 */
export const PhoneMenu: Story = {
  // A phone: the viewport of the canvas and the story tests, the tag of the screenshot tests.
  globals: { viewport: { value: 'phone' } },
  tags: ['phone'],
  render: ({ tree }) => (
    <DocsLayout tree={tree}>
      <ShortPage />
    </DocsLayout>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open menu' }));
    const menu = await focusedIn('Menu');
    const docs = within(menu).getByRole('navigation', { name: 'Docs' });
    await expect(within(docs).getByRole('link', { name: 'Button' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  },
};

/**
 * The section switcher open: the sections of the tree, each with its description, the current
 * one checked.
 */
export const SectionSwitcher: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Essentials' }));
    const sections = await focusedIn('Sections');
    await expect(within(sections).getByRole('link', { name: 'Essentials' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(within(sections).getByRole('link', { name: 'Guide' })).toHaveAccessibleDescription(
      'How it works and how to set it up',
    );
  },
};

/**
 * The sidebar collapsed: a small toolbar at the top start holds the button that expands it and
 * the search, and the page takes the width.
 */
export const CollapsedSidebar: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Collapse sidebar' }));
    const expand = canvas.getByRole('button', { name: 'Expand sidebar' });
    await waitFor(async () => {
      await expect(expand).toHaveFocus();
    });
    await expect(canvas.queryByRole('navigation', { name: 'Docs' })).toBeNull();
  },
};

/**
 * A page in a folder of its section: the folder is open, its name the link to its index page,
 * its pages under it, and the separators of the section name the groups around it.
 */
export const NestedPage: Story = {
  parameters: { pathname: '/docs/essentials/forms/checkbox' },
  render: ({ tree }) => (
    <DocsLayout tree={tree}>
      <DocsPage title="Checkbox" description="A choice that is on or off." toc={[]}>
        <p>A checkbox sets one option on or off.</p>
      </DocsPage>
    </DocsLayout>
  ),
  play: async ({ canvas }) => {
    const docs = canvas.getByRole('navigation', { name: 'Docs' });
    await expect(within(docs).getByRole('button', { name: 'Forms pages' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    const forms = within(docs).getByRole('list', { name: 'Forms' });
    await expect(within(forms).getByRole('link', { name: 'Checkbox' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  },
};

/**
 * `themeToggle: { mode: 'light-dark-system' }` on `DocsProvider`: the theme toggle at the foot of
 * the sidebar offers the theme of the operating system next to the light and the dark one.
 */
export const LightDarkSystemTheme: Story = {
  parameters: { themeToggle: 'light-dark-system' },
  render: ({ tree }) => (
    <DocsLayout tree={tree}>
      <ShortPage />
    </DocsLayout>
  ),
  play: async ({ canvas }) => {
    const picker = canvas.getByRole('radiogroup', { name: 'Theme' });
    await expect(picker.closest('.contour-docs-sidebar__footer')).not.toBeNull();
    await expect(within(picker).getAllByRole('radio')).toHaveLength(3);
  },
};

/**
 * A page outside the sections, such as the index of the docs: the switcher says "Sections", and
 * the navigation lists the pages around the sections and the sections themselves, each a link to
 * where it starts.
 */
export const OutsideTheSections: Story = {
  parameters: { pathname: '/docs' },
  render: ({ tree }) => (
    <DocsLayout tree={tree}>
      <DocsPage title="Introduction" description="What the docs cover." toc={[]}>
        <p>Start with the guide, or go to the components.</p>
      </DocsPage>
    </DocsLayout>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Sections' })).toBeVisible();
    const docs = canvas.getByRole('navigation', { name: 'Docs' });
    await expect(within(docs).getByRole('link', { name: 'Guide' })).toHaveAttribute(
      'href',
      '/docs/guide',
    );
    await expect(within(docs).getByRole('link', { name: 'Introduction' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  },
};
