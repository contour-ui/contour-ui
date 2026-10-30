import * as icons from '@contour-ui/icons';
import { githubIcon, searchIcon } from '@contour-ui/icons';
import type { IconData } from '@contour-ui/icons';
import { vars } from '@contour-ui/tokens';
import { describe, expect, test } from 'vite-plus/test';
import { render } from 'vitest-browser-react';

import { Icon } from '../index.ts';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';

/** Every icon of the set: the `IconData` exports of `@contour-ui/icons`. */
const ICON_SET = Object.values(icons).filter(
  (value): value is IconData => typeof value === 'object' && 'paths' in value,
);

/** `value`, failing the test when the element is missing. */
function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('Expected the element to be rendered.');
  }
  return value;
}

describe('Icon', () => {
  test('is decorative without a label', async () => {
    const screen = await render(<Icon icon={searchIcon} />);
    const svg = screen.container.querySelector('svg');

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
    expect(screen.container.querySelector('[role="img"]')).toBeNull();
  });

  test('is an image named by its label', async () => {
    const screen = await render(<Icon icon={githubIcon} label="GitHub" />);
    const image = screen.getByRole('img', { name: 'GitHub' });

    await expect.element(image).toHaveClass('contour-icon');
    await expect.element(image).not.toHaveAttribute('aria-hidden');
  });

  test('draws every icon of the set', async () => {
    const screen = await render(
      <>
        {ICON_SET.map((icon) => (
          <Icon key={icon.name} icon={icon} label={icon.name} />
        ))}
      </>,
    );
    const images = screen.getByRole('img').elements();

    expect(ICON_SET.length).toBeGreaterThan(0);
    expect(images.map((image) => image.getAttribute('aria-label'))).toStrictEqual(
      ICON_SET.map((icon) => icon.name),
    );
    expect(images.filter((image) => image.querySelector('path') === null)).toStrictEqual([]);
  });

  test('renders the class, the part attributes and the merged className', async () => {
    const screen = await render(<Icon icon={searchIcon} className="extra" />);
    const svg = screen.container.querySelector('svg');

    expect(svg).toHaveClass('contour-icon', 'extra');
    expect(svg).toHaveAttribute('data-scope', 'icon');
    expect(svg).toHaveAttribute('data-part', 'root');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  test('follows the font size by default and takes a size in pixels or a CSS length', async () => {
    const screen = await render(
      <p style={{ fontSize: '20px' }}>
        <Icon icon={searchIcon} />
        <Icon icon={searchIcon} size={12} />
        <Icon icon={searchIcon} size="2em" />
      </p>,
    );
    const [inherited, pixels, length] = screen.container.querySelectorAll('svg');

    expect(inherited?.getBoundingClientRect().width).toBe(20);
    expect(pixels?.getBoundingClientRect().width).toBe(12);
    expect(length?.getBoundingClientRect().height).toBe(40);
  });

  test('strokes outlined paths and fills logo paths with the text color', async () => {
    const screen = await render(
      <span style={{ color: vars.color.accent.fg }}>
        <Icon icon={searchIcon} />
        <Icon icon={githubIcon} />
      </span>,
    );
    const [outlined, logo] = screen.container.querySelectorAll('svg');
    const color = getComputedStyle(present(screen.container.querySelector('span'))).color;
    const logoPath = present(logo?.querySelector('path'));

    // The token resolves to a real color, and the icon paints with it.
    expect(color).toMatch(/^oklch\(/u);
    expect(getComputedStyle(present(outlined)).stroke).toBe(color);
    expect(getComputedStyle(present(outlined)).fill).toBe('none');
    expect(getComputedStyle(logoPath).fill).toBe(color);
    expect(getComputedStyle(logoPath).stroke).toBe('none');
  });

  test('stays in the line of text', async () => {
    const screen = await render(
      <p>
        Search <Icon icon={searchIcon} /> here
      </p>,
    );
    const svg = present(screen.container.querySelector('svg'));

    // Set explicitly, so a reset that makes every `svg` a block cannot move it to its own line.
    expect(getComputedStyle(svg).display).toBe('inline-block');
  });

  test('joins the name of a link as a separate word', async () => {
    const screen = await render(
      <a href="https://example.com/">
        Example
        <Icon icon={searchIcon} label="opens in a new tab" />
      </a>,
    );

    await expect
      .element(screen.getByRole('link'))
      .toHaveAccessibleName('Example opens in a new tab');
  });

  test('is an inline block without the stylesheet, and CSS still wins', async () => {
    const screen = await render(
      <>
        <Icon icon={searchIcon} />
        <Icon icon={searchIcon} style={{ display: 'none' }} />
      </>,
    );
    const [plain, styled] = screen.container.querySelectorAll('svg');

    // A presentation attribute: the name keeps its spaces where `styles.css` is not loaded.
    expect(plain).toHaveAttribute('display', 'inline-block');
    expect(getComputedStyle(present(styled)).display).toBe('none');
  });

  test('uses the icon stroke width unless one is given', async () => {
    const screen = await render(
      <>
        <Icon icon={searchIcon} />
        <Icon icon={searchIcon} strokeWidth={1.5} />
      </>,
    );
    const [standard, thin] = screen.container.querySelectorAll('svg');

    expect(standard).toHaveAttribute('stroke-width', String(searchIcon.strokeWidth));
    expect(thin).toHaveAttribute('stroke-width', '1.5');
  });

  test('passes other svg props through, the user winning on conflicts', async () => {
    const screen = await render(<Icon icon={searchIcon} aria-hidden={false} id="search" />);
    const svg = screen.container.querySelector('svg');

    expect(svg).toHaveAttribute('id', 'search');
    expect(svg).toHaveAttribute('aria-hidden', 'false');
  });
});
