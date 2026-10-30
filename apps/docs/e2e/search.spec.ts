import type { Page } from '@playwright/test';

import { expect, openPage, test } from './fixtures.ts';

const searchDialog = (page: Page) => page.getByRole('dialog', { name: 'Search' });

const searchField = (page: Page) =>
  searchDialog(page).getByRole('combobox', { name: 'Search the docs' });

test('the shortcut opens the search, and Enter goes to the first result', async ({ page }) => {
  await openPage(page, '/docs/guide');
  await page.keyboard.press('ControlOrMeta+K');
  await expect(searchDialog(page)).toBeVisible();
  await expect(searchField(page)).toBeFocused();

  await searchField(page).fill('button');
  await expect(searchDialog(page).getByRole('option').first()).toContainText('Button');
  await searchField(page).press('Enter');
  await expect(page).toHaveURL('/docs/components/button');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Button');
  await expect(searchDialog(page)).toBeHidden();
});

for (const width of [390, 1280]) {
  test(`the Search button opens the search at ${width}px, and Escape returns the focus`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await openPage(page, '/docs/guide');
    const trigger = page.getByRole('banner').getByRole('button', { name: 'Search', exact: true });
    await expect(trigger).toHaveAttribute('aria-keyshortcuts', /K/u);
    await trigger.click();
    await expect(searchDialog(page)).toBeVisible();
    await expect(searchField(page)).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(searchDialog(page)).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}
