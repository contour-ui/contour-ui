import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps, ReactElement } from 'react';
import { expect, within } from 'storybook/test';

import { Link } from '../index.ts';

/** A router's link: takes `to` instead of `href` and passes the rest on to `<a>`. */
function RouterLink({
  to,
  children,
  ...props
}: ComponentProps<'a'> & { readonly to: string }): ReactElement {
  return (
    <a href={to} {...props}>
      {children}
    </a>
  );
}

const meta: Meta<typeof Link> = {
  title: 'Essentials/Link',
  component: Link,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { href: '#', children: 'Read the guide' },
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Read the guide' });

    await expect(link).toHaveClass('contour-link');
    await expect(link).toHaveAttribute('data-variant', 'plain');
  },
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: vars.space['section-gap'] }}>
      <Link href="#">Plain</Link>
      <Link variant="underline" href="#">
        Underline
      </Link>
      <Link variant="neutral" href="#">
        Neutral
      </Link>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Plain' })).toHaveAttribute(
      'data-variant',
      'plain',
    );
    await expect(canvas.getByRole('link', { name: 'Underline' })).toHaveAttribute(
      'data-variant',
      'underline',
    );
    await expect(canvas.getByRole('link', { name: 'Neutral' })).toHaveAttribute(
      'data-variant',
      'neutral',
    );
  },
};

/**
 * In a list of navigation links, such as a site header, an index or a footer, links are
 * `neutral`: the list, not the color, tells them from text.
 */
export const Navigation: Story = {
  render: () => (
    <nav aria-label="Site">
      <ul
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: vars.space['section-gap'],
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {['Docs', 'Essentials', 'Audio', 'Tokens'].map((label) => (
          <li key={label}>
            <Link variant="neutral" href="#">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  ),
  play: async ({ canvas }) => {
    const links = within(canvas.getByRole('navigation', { name: 'Site' })).getAllByRole('link');

    await expect(links.map((link) => link.dataset['variant'])).toStrictEqual([
      'neutral',
      'neutral',
      'neutral',
      'neutral',
    ]);
  },
};

/** In running text, links are underlined, so they do not stand out by color alone. */
export const InText: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: vars.space['section-gap'], maxInlineSize: '36rem' }}>
      <p style={{ margin: 0 }}>
        Read the{' '}
        <Link variant="underline" href="#">
          installation guide
        </Link>{' '}
        first: it lists the stylesheets to load and their order.
      </p>
      <p
        style={{
          margin: 0,
          font: vars.text.prose.font,
          letterSpacing: vars.text.prose.letterSpacing,
        }}
      >
        A link takes the font of the text around it, as in this paragraph, which uses the{' '}
        <Link variant="underline" href="#">
          prose text style
        </Link>
        .
      </p>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'installation guide' })).toHaveAttribute(
      'data-variant',
      'underline',
    );
    await expect(canvas.getByRole('link', { name: 'prose text style' })).toHaveAttribute(
      'data-variant',
      'underline',
    );
  },
};

/** `asChild` renders a router's link with the Link class and attributes. */
export const AsChild: Story = {
  render: () => (
    <Link asChild variant="underline">
      <RouterLink to="/docs/guide">Guide</RouterLink>
    </Link>
  ),
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Guide' });

    await expect(link).toHaveClass('contour-link');
    await expect(link).toHaveAttribute('href', '/docs/guide');
    await expect(link).toHaveAttribute('data-variant', 'underline');
  },
};
