import { fileTextIcon, githubIcon } from '@contour-ui/icons';
import type { CSSProperties } from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';

import { HomeLayout } from '../index.ts';
import type { DocsSite } from '../index.ts';
import { renderDocs } from '../test-utils/render.tsx';
import type { RenderDocsOptions } from '../test-utils/render.tsx';
import { createSearchIndexUrl } from '../test-utils/search-index.ts';
import { site } from '../test-utils/site.ts';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';
import '@contour-ui/react/styles.css';

/** The site of the fixtures, with a link to another site and one to a page of its own. */
const SITE: DocsSite = {
  ...site,
  links: [
    { label: 'GitHub', href: 'https://github.com/contour-ui/contour-ui', icon: githubIcon },
    { label: 'Changelog', href: '/changelog', icon: fileTextIcon },
  ],
};

/**
 * A column of a page, laid out as the header lays out its own: `--contour-docs-home-width` wide,
 * centered, with at least the page inset at the sides. `main` is a flex column, where the auto
 * margins would shrink it to its content: it takes the width first.
 */
const COLUMN: CSSProperties = {
  boxSizing: 'border-box',
  inlineSize: '100%',
  maxInlineSize: 'calc(var(--contour-docs-home-width) + 2 * var(--contour-docs-page-inset))',
  marginInline: 'auto',
  paddingInline: 'var(--contour-docs-page-inset)',
};

/** The URL of the search index of the fixtures. */
let from = '';

beforeAll(async () => {
  from = await createSearchIndexUrl();
});

afterEach(async () => {
  Reflect.deleteProperty(navigator, 'userAgentData');
  // The default viewport of the browser tests.
  await page.viewport(414, 896);
});

const banner = page.getByRole('banner');
const brand = banner.getByRole('link', { name: 'contour-ui' });
const nav = banner.getByRole('navigation', { name: 'Main' });
const searchButton = banner.getByRole('button', { name: 'Search' });
const themeToggle = banner.getByRole('button', { name: /^Switch to the/u });

/** The box of the element of a locator, on the page. */
const box = (locator: { readonly element: () => Element }): DOMRect =>
  locator.element().getBoundingClientRect();

/** Render the home page of the fixtures, at `/`, with its search unless `options` say otherwise. */
async function renderHome(options: RenderDocsOptions = {}): Promise<void> {
  await renderDocs(
    <HomeLayout>
      <h1>Home</h1>
    </HomeLayout>,
    { pathname: '/', search: { from }, ...options },
  );
  await expect.element(nav).toBeVisible();
}

describe('HomeLayout', () => {
  it('has the site header, with the links of the site, and `main#content`', async () => {
    await renderHome({ site: SITE });

    await expect.element(brand).toHaveAttribute('href', '/');
    // The text links of the site are its navigation "Main", a list of neutral `Link`s.
    expect(nav.getByRole('listitem').elements()).toHaveLength(3);
    expect(
      nav
        .getByRole('link')
        .elements()
        .map((link) => link.textContent),
    ).toStrictEqual(['Docs', 'Guide', 'Essentials']);
    await expect.element(nav.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs');
    await expect
      .element(nav.getByRole('link', { name: 'Essentials' }))
      .toHaveAttribute('data-variant', 'neutral');
    await expect.element(searchButton).toBeVisible();
    // A link to another site opens in a new tab, and says so.
    const github = banner.getByRole('link', { name: 'GitHub (opens in a new tab)' });
    await expect.element(github).toHaveAttribute('target', '_blank');
    await expect.element(github).not.toHaveAttribute('data-framework-link');
    // A link to a path of the site goes through the framework, in the same tab.
    const changelog = banner.getByRole('link', { name: 'Changelog', exact: true });
    await expect.element(changelog).toHaveAttribute('data-framework-link');
    await expect.element(changelog).not.toHaveAttribute('target');
    await expect.element(page.getByRole('main')).toHaveAttribute('id', 'content');
    expect(document.querySelector('a[href], button')).toBe(
      page.getByRole('link', { name: 'Skip to content' }).element(),
    );
  });

  it('leaves the search out of its header with `search={false}`, not out of the site', async () => {
    // Ctrl K, the shortcut of the platforms other than Apple's.
    Object.defineProperty(navigator, 'userAgentData', {
      configurable: true,
      value: { platform: 'Windows' },
    });
    await renderDocs(
      <HomeLayout search={false}>
        <h1>Home</h1>
      </HomeLayout>,
      { pathname: '/', search: { from } },
    );

    await expect.element(nav).toBeVisible();
    expect(page.getByRole('button', { name: 'Search' }).elements()).toHaveLength(0);
    await userEvent.keyboard('{Control>}k{/Control}');
    await expect.element(page.getByRole('dialog', { name: 'Search' })).toBeVisible();
  });

  it('leaves the search out on a site without it', async () => {
    await renderHome({ search: false });

    expect(page.getByRole('button', { name: 'Search' }).elements()).toHaveLength(0);
  });
});

describe('the header of HomeLayout', () => {
  it('lays its content out in the 80rem column of the page, centered', async () => {
    await page.viewport(1440, 900);
    await renderHome();
    const header = box(banner);
    const margin = (header.width - 1280) / 2;

    // The brand at the start of the column, the theme toggle at its end, the links before both.
    expect(box(brand).left - header.left).toBeCloseTo(margin, 1);
    expect(header.right - box(themeToggle).right).toBeCloseTo(margin, 1);
    expect(box(nav).right).toBeLessThan(box(searchButton).left);
    // 4.5rem high, and part of the page: no divider, the color of the page.
    expect(header.height).toBe(72);
    const style = getComputedStyle(banner.element());
    expect(style.borderBlockEndWidth).toBe('0px');
    expect(style.backgroundColor).toBe(getComputedStyle(document.body).backgroundColor);
  });

  it('keeps the page inset at the sides where the viewport is narrower than the column', async () => {
    await page.viewport(1024, 768);
    await renderHome();
    const header = box(banner);

    // 2rem, the page inset from 48rem.
    expect(box(brand).left - header.left).toBe(32);
    expect(header.right - box(themeToggle).right).toBe(32);
  });

  it('takes the width of the column from --contour-docs-home-width', async () => {
    await page.viewport(1280, 800);
    const style = document.createElement('style');
    style.textContent = '.contour-docs-home-layout { --contour-docs-home-width: 40rem; }';
    document.head.append(style);
    try {
      await renderHome();
      const header = box(banner);

      expect(box(themeToggle).right - box(brand).left).toBeCloseTo(640, 1);
      expect(box(brand).left - header.left).toBeCloseTo(header.right - box(themeToggle).right, 1);
    } finally {
      style.remove();
    }
  });

  it('lines its brand up with a column of the page laid out as its own, at any width', async () => {
    await page.viewport(1280, 800);
    await renderDocs(
      <HomeLayout>
        <div style={COLUMN}>
          <h1>Home</h1>
        </div>
      </HomeLayout>,
      { pathname: '/', search: { from } },
    );
    const heading = page.getByRole('heading', { level: 1 });
    await expect.element(heading).toBeVisible();
    const start = box(brand).left;
    expect(box(heading).left).toBe(start);

    // A narrower column, from the app's CSS: both move in.
    const style = document.createElement('style');
    style.textContent = '.contour-docs-home-layout { --contour-docs-home-width: 48rem; }';
    document.head.append(style);
    try {
      expect(box(brand).left).toBeGreaterThan(start);
      expect(box(heading).left).toBe(box(brand).left);
    } finally {
      style.remove();
    }
  });

  it('shows the search as a field with its shortcut from 48rem, and as an icon below', async () => {
    await page.viewport(1280, 800);
    await renderHome();
    await expect.element(searchButton).toHaveClass('contour-docs-search-trigger');

    await page.viewport(390, 844);
    await expect.element(searchButton).not.toHaveClass('contour-docs-search-trigger');
    await expect.element(searchButton).toBeVisible();
  });

  it('is 3rem high on phones, as the header of the docs pages there', async () => {
    await page.viewport(390, 844);
    await renderHome();

    expect(box(banner).height).toBe(48);
    // 1rem, the page inset of phones.
    expect(box(brand).left - box(banner).left).toBe(16);
  });

  it('fits a 360px viewport with three links of the site, the search and the buttons', async () => {
    await page.viewport(360, 740);
    await renderHome();
    const header = banner.element();

    // Nothing runs past the end of the header, nor of the page.
    expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
    expect(box(themeToggle).right).toBeLessThanOrEqual(360 - 16);
    await expect.element(searchButton).toBeVisible();
    // Out of room, the links scroll in their own box: at its end, the last one shows in full,
    // with room for its focus ring (twice the 2px of the ring's width). The scroll range is in
    // whole pixels (`scrollWidth`, `clientWidth`) and the width of the text is not: the end may
    // fall short of it by less than a pixel.
    const links = nav.element();
    links.scrollLeft = links.scrollWidth;
    expect(box(nav.getByRole('link', { name: 'Essentials' })).right + 4).toBeLessThan(
      box(nav).right + 1,
    );
  });

  it('shows the three links in full on a phone without the search', async () => {
    await page.viewport(390, 844);
    await renderDocs(
      <HomeLayout search={false}>
        <h1>Home</h1>
      </HomeLayout>,
      { pathname: '/', search: { from } },
    );
    await expect.element(nav).toBeVisible();
    const links = nav.element();
    const header = banner.element();

    expect(banner.getByRole('button', { name: 'Search' }).elements()).toHaveLength(0);
    // Nothing scrolls, nothing runs past the end of the header.
    expect(links.scrollWidth).toBeLessThanOrEqual(links.clientWidth);
    expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
  });

  it('fits the three-way theme picker in the header of a phone, next to the search', async () => {
    await page.viewport(390, 844);
    await renderHome({ themeToggle: { mode: 'light-dark-system' } });
    const header = banner.element();

    await expect.element(banner.getByRole('radiogroup', { name: 'Theme' })).toBeVisible();
    await expect.element(searchButton).toBeVisible();
    expect(header.scrollWidth).toBeLessThanOrEqual(header.clientWidth);
  });

  it('shows the three links in full at 360px next to a brand as small as a logo mark', async () => {
    await page.viewport(360, 740);
    // A one-letter name, as narrow as the mark the logo of the docs site leaves on phones.
    await renderHome({ site: { ...site, name: 'C' } });
    const links = nav.element();

    await expect.element(searchButton).toBeVisible();
    expect(links.scrollWidth).toBeLessThanOrEqual(links.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  });
});
