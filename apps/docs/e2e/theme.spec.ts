import { expect, openPage, reloadPage, test } from './fixtures.ts';

/** The `localStorage` key of the theme choice (the default of the styled `ThemeProvider`). */
const STORAGE_KEY = 'contour-theme';

test('the toggle switches the theme, and the choice outlives a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await openPage(page, '/docs/guide');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'light');

  const banner = page.getByRole('banner');
  await banner.getByRole('button', { name: 'Switch to the dark theme' }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  const toLight = banner.getByRole('button', { name: 'Switch to the light theme' });
  await expect(toLight).toBeVisible();

  await reloadPage(page);
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await toLight.click();
  await expect(html).toHaveAttribute('data-theme', 'light');
});

test.describe('before the app loads', () => {
  // The app's scripts are blocked below, and the browser reports each of them.
  test.use({ expectedConsole: [/Failed to load resource/u] });

  test('the stored theme is already applied', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.addInitScript((key) => {
      localStorage.setItem(key, 'dark');
    }, STORAGE_KEY);
    await page.route('**/*.js', (route) => route.abort());
    await page.goto('/docs/guide');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

for (const [colorScheme, other] of [
  ['light', 'dark'],
  ['dark', 'light'],
] as const) {
  test(`with nothing stored, a ${colorScheme} system scheme sets the theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await openPage(page, '/docs/guide');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', colorScheme);

    // The page follows the system as it changes.
    await page.emulateMedia({ colorScheme: other });
    await expect(html).toHaveAttribute('data-theme', other);
  });
}
