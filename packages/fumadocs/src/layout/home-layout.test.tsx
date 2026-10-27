import { fileTextIcon, githubIcon } from '@contour-ui/icons';
import { describe, expect, it } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';

import { HomeLayout } from '../index.ts';
import type { DocsSite } from '../index.ts';
import { renderDocs } from '../test-utils/render.tsx';
import { site } from '../test-utils/site.ts';

/** The site of the fixtures, with a link to another site and one to a page of its own. */
const SITE: DocsSite = {
  ...site,
  links: [
    { label: 'GitHub', href: 'https://github.com/contour-ui/contour-ui', icon: githubIcon },
    { label: 'Changelog', href: '/changelog', icon: fileTextIcon },
  ],
};

describe('HomeLayout', () => {
  it('has the site header, with the links of the site, and `main#content`', async () => {
    await renderDocs(
      <HomeLayout>
        <h1>Home</h1>
      </HomeLayout>,
      { pathname: '/', site: SITE },
    );
    const banner = page.getByRole('banner');

    await expect
      .element(banner.getByRole('link', { name: 'contour-ui' }))
      .toHaveAttribute('href', '/');
    await expect
      .element(banner.getByRole('link', { name: 'Docs' }))
      .toHaveAttribute('href', '/docs');
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

  it('leaves the search out on a site without it', async () => {
    await renderDocs(
      <HomeLayout>
        <h1>Home</h1>
      </HomeLayout>,
      { pathname: '/' },
    );

    await expect.element(page.getByRole('link', { name: 'Docs' })).toBeVisible();
    expect(page.getByRole('button', { name: 'Search' }).elements()).toHaveLength(0);
  });
});
