import { expect, openPage, test } from './fixtures.ts';

test.use({ viewport: { width: 390, height: 844 } });

test('Escape closes the menu and returns the focus to its button', async ({ page }) => {
  await openPage(page, '/docs/guide');
  const open = page.getByRole('banner').getByRole('button', { name: 'Open menu' });
  await open.click();
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await expect(menu).toBeVisible();
  // The menu takes the focus on the frame its layer starts listening for Escape.
  await expect
    .poll(() => menu.evaluate((element) => element.contains(document.activeElement)))
    .toBe(true);

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(open).toBeFocused();
});

test('the close button closes the menu', async ({ page }) => {
  await openPage(page, '/docs/guide');
  await page.getByRole('banner').getByRole('button', { name: 'Open menu' }).click();
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await menu.getByRole('button', { name: 'Close menu' }).click();
  await expect(menu).toBeHidden();
});

test('a link in the menu goes to its page and closes the menu', async ({ page }) => {
  await openPage(page, '/docs/guide');
  await page.getByRole('banner').getByRole('button', { name: 'Open menu' }).click();
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await expect(
    menu
      .getByRole('navigation', { name: 'Docs' })
      .getByRole('link', { name: 'How contour-ui works' }),
  ).toHaveAttribute('aria-current', 'page');

  await menu.getByRole('link', { name: 'Installation' }).click();
  await expect(page).toHaveURL('/docs/guide/installation');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Installation');
  await expect(menu).toBeHidden();
});
