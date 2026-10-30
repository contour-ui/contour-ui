import { expect, openPage, test } from './fixtures.ts';

// The browser reports the 404 responses: the page's, and for a docs path, its data's.
test.use({ expectedConsole: [/the server responded with a status of 404/u] });

for (const url of ['/nope', '/docs/nope', '/docs/components/nope']) {
  test(`${url} shows the 404 page`, async ({ page }) => {
    const response = await openPage(page, url);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Not found');
    await expect(page).toHaveTitle('Not found');
  });
}

test('the 404 page leads back to the docs', async ({ page }) => {
  await openPage(page, '/nope');
  await page.getByRole('main').getByRole('link', { name: 'Back to docs' }).click();
  await expect(page).toHaveURL('/docs');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contour UI');
});
