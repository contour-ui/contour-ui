import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { DocsLayout, DocsPage } from '../index.ts';
import { Prose } from '../mdx/index.ts';
import { PageContent } from '../test-utils/page-content.tsx';
import { pageTree } from '../test-utils/page-tree.ts';
import { toc } from '../test-utils/toc.ts';

/**
 * A docs page in `DocsLayout`: its header (the title, the page's `h1`, and the description), the
 * content, the links to the previous and the next page of the section, and the table of contents,
 * a bar above the article until 80rem and a column beside it from there.
 */
const meta: Meta<typeof DocsPage> = {
  title: 'Fumadocs/DocsPage',
  component: DocsPage,
  args: { title: 'Button', description: 'A button that runs an action.', toc },
  render: (args) => (
    <DocsLayout tree={pageTree}>
      <DocsPage {...args}>
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

/** From 80rem, the table of contents is a column beside the article. */
export const TocColumn: Story = {
  play: async ({ canvas }) => {
    const column = canvas.getByRole('navigation', { name: 'On this page' });
    await expect(within(column).getByRole('link', { name: 'Usage' })).toHaveAttribute(
      'href',
      '#usage',
    );
    // The headings below `h3` are left out.
    await expect(within(column).queryByRole('link', { name: 'Focus order' })).toBeNull();
  },
};

/**
 * Below 80rem, the table of contents is a bar that sticks above the article: it shows the
 * heading being read.
 */
export const TocBar: Story = {
  // A phone: the viewport of the canvas and the story tests, the tag of the screenshot tests.
  globals: { viewport: { value: 'phone' } },
  tags: ['phone'],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /^On this page/u })).toBeVisible();
    await expect(canvas.queryByRole('navigation', { name: 'On this page' })).toBeNull();
  },
};

/**
 * The bar opens the list in a popover, the link of the heading being read focused. The headings
 * below `h3` are left out.
 */
export const TocPopover: Story = {
  // A phone: the viewport of the canvas and the story tests, the tag of the screenshot tests.
  globals: { viewport: { value: 'phone' } },
  tags: ['phone'],
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^On this page/u }));
    const popover = await screen.findByRole('dialog', { name: 'On this page' });
    await waitFor(async () => {
      await expect(within(popover).getByRole('link', { name: 'Usage' })).toHaveFocus();
    });
    await expect(within(popover).getByRole('link', { name: 'Keyboard' })).toHaveAttribute(
      'href',
      '#keyboard',
    );
    await expect(within(popover).queryByRole('link', { name: 'Focus order' })).toBeNull();
  },
};

/** A page without headings has no table of contents, neither a bar nor a column. */
export const WithoutToc: Story = {
  args: { title: 'Dialog', description: 'A window over the page.', toc: [] },
  parameters: { pathname: '/docs/essentials/dialog' },
  render: (args) => (
    <DocsLayout tree={pageTree}>
      <DocsPage {...args}>
        <Prose>
          <p>A dialog asks for the attention of the user, over the page.</p>
        </Prose>
      </DocsPage>
    </DocsLayout>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: /^On this page/u })).toBeNull();
    // A short page: the links to the neighbours sit at the bottom of the viewport.
    const footer = canvas.getByRole('navigation', { name: 'Previous and next page' });
    await expect(Math.round(footer.getBoundingClientRect().bottom)).toBeGreaterThan(
      window.innerHeight * 0.75,
    );
  },
};

/** The first page of a section links to the next one only. */
export const FirstPageOfSection: Story = {
  args: { title: 'Guide', description: 'How it works and how to set it up.', toc: [] },
  parameters: { pathname: '/docs/guide' },
  render: (args) => (
    <DocsLayout tree={pageTree}>
      <DocsPage {...args}>
        <Prose>
          <p>The guide shows how the packages fit together.</p>
        </Prose>
      </DocsPage>
    </DocsLayout>
  ),
  play: async ({ canvas }) => {
    const neighbours = canvas.getByRole('navigation', { name: 'Previous and next page' });
    await expect(within(neighbours).getAllByRole('link')).toHaveLength(1);
    await expect(within(neighbours).getByRole('link', { name: /^Next/u })).toHaveAttribute(
      'href',
      '/docs/guide/installation',
    );
  },
};

/** The last page of a section links to the previous one only. */
export const LastPageOfSection: Story = {
  args: { title: 'Plain CSS', description: 'Styles without the components.', toc: [] },
  parameters: { pathname: '/docs/guide/css' },
  render: (args) => (
    <DocsLayout tree={pageTree}>
      <DocsPage {...args}>
        <Prose>
          <p>The tokens work in plain CSS too.</p>
        </Prose>
      </DocsPage>
    </DocsLayout>
  ),
  play: async ({ canvas }) => {
    const neighbours = canvas.getByRole('navigation', { name: 'Previous and next page' });
    await expect(within(neighbours).getAllByRole('link')).toHaveLength(1);
    await expect(within(neighbours).getByRole('link', { name: /^Previous/u })).toHaveAttribute(
      'href',
      '/docs/guide/tokens',
    );
  },
};
