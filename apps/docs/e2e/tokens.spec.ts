/**
 * The Tokens page: both themes side by side whatever the theme of the page, and copy buttons that
 * write the name of their token to the clipboard.
 */
import type { Locator } from '@playwright/test';

import { expect, openPage, test } from './fixtures.ts';

/** The background a panel paints, as the browser computes it. */
const backgroundOf = (panel: Locator): Promise<string> =>
  panel.evaluate((element) => getComputedStyle(element).backgroundColor);

test.describe('in the light theme', () => {
  test.use({ colorScheme: 'light', permissions: ['clipboard-read', 'clipboard-write'] });

  test('a group shows both themes, and its copy button copies the token', async ({ page }) => {
    await openPage(page, '/docs/guide/tokens');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    const main = page.getByRole('main');
    const dark = main.getByRole('group', { name: 'Background, dark theme' });
    const light = main.getByRole('group', { name: 'Background, light theme' });
    await expect(dark).toHaveAttribute('data-theme', 'dark');
    await expect(light).toHaveAttribute('data-theme', 'light');
    // The dark panel keeps its own surface on a light page.
    expect(await backgroundOf(dark)).not.toBe(await backgroundOf(light));

    const copy = dark.getByRole('button', { name: 'Copy --ct-color-bg-surface' });
    await copy.click();
    // The trigger keeps its text while its icon shows the copy.
    await expect(copy).toHaveAttribute('data-copied', '');
    await expect(copy).toHaveText('Copy');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('--ct-color-bg-surface');
  });
});
