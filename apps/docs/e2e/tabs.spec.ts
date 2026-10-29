/**
 * Tabs on the docs pages: the code block tabs of `npm` and `package-install` blocks, one group
 * across the site (`remarkNpmOptions.persist` in `vite.config.ts`), those of code blocks with a
 * `tab` meta, and `Tabs` in MDX with links to its tabs.
 */
import type { Locator, Page } from '@playwright/test';

import { expect, openPage, reloadPage, test } from './fixtures.ts';

const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'];

/** The lists of tabs of the package managers on the page: one per install command. */
function installBlocks(page: Page): Locator {
  return page
    .getByRole('main')
    .getByRole('tablist')
    .filter({ has: page.getByRole('tab', { name: 'bun', exact: true }) });
}

test.describe('an install command', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('shows the command of each package manager, npm first', async ({ page }) => {
    await openPage(page, '/docs/guide/installation');
    const block = installBlocks(page).first();

    await expect(block.getByRole('tab')).toHaveText(PACKAGE_MANAGERS);
    await expect(block.getByRole('tab', { name: 'npm', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const panel = page.getByRole('main').getByRole('tabpanel').first();
    await expect(panel).toHaveText('npm install @contour-ui/react @contour-ui/tokens');

    await block.getByRole('tab', { name: 'pnpm', exact: true }).click();
    await expect(page.getByRole('main').getByRole('tabpanel').first()).toHaveText(
      'pnpm add @contour-ui/react @contour-ui/tokens',
    );
    await expect(
      page.getByRole('main').getByRole('button', { name: 'Copy code' }).first(),
    ).toBeVisible();
  });

  test('shows the package manager picked in one block in every block, on the next pages too', async ({
    page,
  }) => {
    await openPage(page, '/docs/guide/installation');
    const blocks = installBlocks(page);
    await expect(blocks).toHaveCount(3);

    await blocks.nth(2).getByRole('tab', { name: 'yarn', exact: true }).click();
    // Every block selects yarn.
    await expect(
      blocks.getByRole('tab', { name: 'yarn', exact: true, selected: true }),
    ).toHaveCount(3);
    await expect(
      page.getByRole('main').getByText('yarn add @contour-ui/headless-react'),
    ).toBeVisible();

    // Remembered across visits, and on another page of the site.
    await reloadPage(page);
    await expect(
      installBlocks(page).first().getByRole('tab', { name: 'yarn', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    await openPage(page, '/docs/fumadocs');
    await expect(
      installBlocks(page).first().getByRole('tab', { name: 'yarn', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  test('moves along the tabs with the arrow keys, then on to the copy button', async ({ page }) => {
    await openPage(page, '/docs/guide/installation');
    const block = installBlocks(page).first();
    await block.getByRole('tab', { name: 'npm', exact: true }).click();

    await page.keyboard.press('ArrowRight');
    const pnpm = block.getByRole('tab', { name: 'pnpm', exact: true });
    await expect(pnpm).toBeFocused();
    await expect(pnpm).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(block.getByRole('tab', { name: 'bun', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.keyboard.press('Home');
    await expect(block.getByRole('tab', { name: 'npm', exact: true })).toBeFocused();

    // The next blocks follow the keyboard too.
    await page.keyboard.press('ArrowLeft');
    await expect(
      installBlocks(page).last().getByRole('tab', { name: 'bun', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('main').getByRole('button', { name: 'Copy code' }).first(),
    ).toBeFocused();
  });
});

test.describe('tabs on the page of the MDX components', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('code blocks with a tab meta switch, a block with a title keeps its header', async ({
    page,
  }) => {
    await openPage(page, '/docs/fumadocs/mdx');
    const frameworks = page
      .getByRole('main')
      .getByRole('tablist')
      .filter({ has: page.getByRole('tab', { name: 'Next.js' }) });

    await expect(frameworks.getByRole('tab')).toHaveText(['React Router', 'Next.js']);
    await frameworks.getByRole('tab', { name: 'Next.js' }).click();
    await expect(page.getByRole('figure', { name: 'app/layout.tsx' })).toBeVisible();
  });

  test('a tab the reader selects goes into the address, and the address opens it', async ({
    page,
  }) => {
    await openPage(page, '/docs/fumadocs/mdx');
    const language = page.getByRole('tablist', { name: 'Language' });
    const typescript = language.getByRole('tab', { name: 'TypeScript' });

    await typescript.click();
    await expect(page).toHaveURL(/#tabs-typescript$/u);

    await openPage(page, '/docs/fumadocs/mdx#tabs-typescript');
    await expect(typescript).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'TypeScript' })).toBeInViewport();
  });

  test('a link to a tab in the text opens it', async ({ page }) => {
    await openPage(page, '/docs/fumadocs/mdx');
    const typescript = page.getByRole('tablist', { name: 'Language' }).getByRole('tab', {
      name: 'TypeScript',
    });
    await expect(typescript).toHaveAttribute('aria-selected', 'false');

    await page.getByRole('main').getByRole('link', { name: 'TypeScript', exact: true }).click();
    await expect(typescript).toHaveAttribute('aria-selected', 'true');
  });
});
