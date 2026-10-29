import { Button } from '@contour-ui/react';
import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Link as FrameworkLink } from 'fumadocs-core/framework';
import type { CSSProperties } from 'react';
import { expect, within } from 'storybook/test';

import { HomeLayout } from '../index.ts';

/**
 * The column of the content, as the header lays out its own: `--contour-docs-home-width` wide,
 * centered, with at least the page inset at the sides. A page of the site does the same in its
 * CSS.
 */
const COLUMN: CSSProperties = {
  display: 'grid',
  justifyItems: 'start',
  gap: vars.space['group-gap'],
  boxSizing: 'border-box',
  inlineSize: '100%',
  maxInlineSize: 'calc(var(--contour-docs-home-width) + 2 * var(--contour-docs-page-inset))',
  marginInline: 'auto',
  paddingBlock: vars.space['section-gap'],
  paddingInline: 'var(--contour-docs-page-inset)',
};

/** The start edge of an element on the page, in px. */
const startOf = (element: Element): number => element.getBoundingClientRect().left;

/**
 * The layout of the pages outside the docs, such as the home page: the site header, then the
 * content in `main#content`, which fills the rest of the viewport. The header lays its content out
 * in the column of the page (`--contour-docs-home-width`): the brand at the start; at the end the
 * navigation "Main" with the text links of the site, the search (unless `search={false}`), the
 * icon links and the theme toggle. It has no divider: it is part of the page. The screenshot tests
 * take every story in both themes.
 */
const meta: Meta<typeof HomeLayout> = {
  title: 'Fumadocs/HomeLayout',
  component: HomeLayout,
  args: { search: true },
  render: ({ search }) => (
    <HomeLayout search={search}>
      <div style={COLUMN}>
        <h1 style={{ margin: 0 }}>contour-ui</h1>
        <p style={{ margin: 0 }}>Design system for audio-plugin UIs and general web UI.</p>
        <Button asChild size="lg">
          <FrameworkLink href="/docs/guide">Get started</FrameworkLink>
        </Button>
      </div>
    </HomeLayout>
  ),
  // A page fills the viewport, edge to edge.
  parameters: { pathname: '/', canvasPadding: false },
  globals: { viewport: { value: 'desktop' } },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * From 48rem the header is 4.5rem high, the search is a field with its shortcut, and the brand
 * lines up with the content of the page.
 */
export const Desktop: Story = {
  play: async ({ canvas }) => {
    const header = canvas.getByRole('banner');
    const nav = within(header).getByRole('navigation', { name: 'Main' });
    await expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Docs', 'Guide', 'Kit']);
    await expect(canvas.getByRole('link', { name: 'GitHub (opens in a new tab)' })).toHaveAttribute(
      'target',
      '_blank',
    );
    const [field] = within(header).getAllByRole('button', { name: 'Search' });
    await expect(field).toHaveClass('contour-docs-search-trigger');
    await expect(startOf(canvas.getByRole('link', { name: 'contour-ui' }))).toBe(
      startOf(canvas.getByRole('heading', { level: 1 })),
    );
  },
};

/** `search={false}`: the header leaves the search out; the shortcut still opens it. */
export const DesktopWithoutSearch: Story = {
  args: { search: false },
  play: async ({ canvas }) => {
    const header = canvas.getByRole('banner');
    await expect(within(header).queryByRole('button', { name: 'Search' })).toBeNull();
    await expect(within(header).getByRole('navigation', { name: 'Main' })).toBeVisible();
  },
};

/**
 * Below 48rem the header is 3rem high, as on the docs pages, and the search is an icon button.
 * The links of the site stay in the header: where they run out of room, they scroll sideways in
 * their own box, and the page does not.
 */
export const Phone: Story = {
  // A phone: the viewport of the canvas and the story tests, the tag of the screenshot tests.
  globals: { viewport: { value: 'phone' } },
  tags: ['phone'],
  play: async ({ canvas }) => {
    const header = canvas.getByRole('banner');
    const [icon] = within(header).getAllByRole('button', { name: 'Search' });
    await expect(icon).not.toHaveClass('contour-docs-search-trigger');
    await expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
  },
};

/** `search={false}` on a phone: the three links of the site fit beside the brand and the buttons. */
export const PhoneWithoutSearch: Story = {
  args: { search: false },
  globals: { viewport: { value: 'phone' } },
  tags: ['phone'],
  play: async ({ canvas }) => {
    const header = canvas.getByRole('banner');
    const nav = within(header).getByRole('navigation', { name: 'Main' });
    await expect(within(header).queryByRole('button', { name: 'Search' })).toBeNull();
    // Every link shows in full: nothing scrolls.
    await expect(nav.scrollWidth).toBeLessThanOrEqual(nav.clientWidth);
    await expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
  },
};

/**
 * `themeToggle: { mode: 'light-dark-system' }` on `DocsProvider`, on a phone: the three-way theme
 * picker fits in the header next to the search and the icon links.
 */
export const PhoneLightDarkSystemTheme: Story = {
  // A phone: the viewport of the canvas and the story tests, the tag of the screenshot tests.
  globals: { viewport: { value: 'phone' } },
  tags: ['phone'],
  parameters: { themeToggle: 'light-dark-system' },
  play: async ({ canvas }) => {
    const header = canvas.getByRole('banner');
    const picker = canvas.getByRole('radiogroup', { name: 'Theme' });
    await expect(header.contains(picker)).toBe(true);
    // Inside the width of the header: nothing runs past its end.
    await expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
  },
};

/**
 * `--contour-docs-home-width: 48rem` from the app's CSS: the content of the header and the column
 * of the page narrow together, centered.
 */
export const CustomWidth: Story = {
  args: { search: false },
  decorators: [
    (Story) => (
      <>
        <style>{'.contour-docs-home-layout { --contour-docs-home-width: 48rem; }'}</style>
        <Story />
      </>
    ),
  ],
  play: async ({ canvas }) => {
    const header = canvas.getByRole('banner');
    const brand = canvas.getByRole('link', { name: 'contour-ui' });
    await expect(startOf(brand)).toBe(startOf(canvas.getByRole('heading', { level: 1 })));
    // 48rem of content in the middle of the header, as much room on either side.
    const { left, right } = header.getBoundingClientRect();
    const toggle = within(header).getByRole('button', { name: /^Switch to the/u });
    await expect(toggle.getBoundingClientRect().right - startOf(brand)).toBe(768);
    await expect(startOf(brand) - left).toBe(right - toggle.getBoundingClientRect().right);
  },
};
