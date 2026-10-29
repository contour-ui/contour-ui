import { Button } from '@contour-ui/kit';
import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Link as FrameworkLink } from 'fumadocs-core/framework';
import { expect } from 'storybook/test';

import { HomeLayout } from '../index.ts';

/**
 * The layout of the pages outside the docs, such as the home page: the site header (the brand,
 * the text links of the site, the search, the theme toggle and the icon links), then the content
 * in `main#content`, which fills the rest of the viewport.
 */
const meta: Meta<typeof HomeLayout> = {
  title: 'Fumadocs/HomeLayout',
  component: HomeLayout,
  render: () => (
    <HomeLayout>
      <div
        style={{
          display: 'grid',
          justifyItems: 'start',
          gap: vars.space['group-gap'],
          padding: vars.space['section-gap'],
        }}
      >
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

/** From 48rem the search is a field with its shortcut. */
export const Desktop: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs');
    await expect(canvas.getByRole('link', { name: 'GitHub (opens in a new tab)' })).toHaveAttribute(
      'target',
      '_blank',
    );
    const [field] = canvas.getAllByRole('button', { name: 'Search' });
    await expect(field).toHaveClass('contour-docs-search-trigger');
  },
};

/** Below 48rem the search is an icon button. */
export const Phone: Story = {
  // A phone: the viewport of the canvas and the story tests, the tag of the screenshot tests.
  globals: { viewport: { value: 'phone' } },
  tags: ['phone'],
  play: async ({ canvas }) => {
    const [icon] = canvas.getAllByRole('button', { name: 'Search' });
    await expect(icon).not.toHaveClass('contour-docs-search-trigger');
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
