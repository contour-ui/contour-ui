import { expect, openPage, reloadPage, test } from './fixtures.ts';

test.use({ viewport: { width: 1280, height: 800 } });

test('the home page leads to the guide and to each part of contour-ui', async ({ page }) => {
  await openPage(page, '/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'A design system for audio interfaces',
  );
  const parts = [
    ['Audio', '/docs/audio'],
    ['Kit', '/docs/kit'],
    ['Headless', '/docs/headless'],
  ] as const;
  await Promise.all(
    parts.map(([name, href]) =>
      expect(page.getByRole('link', { name: `Browse ${name}` })).toHaveAttribute('href', href),
    ),
  );

  await page.getByRole('link', { name: 'Get started' }).click();
  await expect(page).toHaveURL('/docs/guide');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How contour-ui works');
});

test('the playhead of the home page waits for a reader who prefers reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPage(page, '/');
  const tracks = page.getByRole('region', { name: 'What contour-ui is made of' });
  const position = tracks.getByText(/^\d{3}\.\d$/u);
  await expect(position).toHaveText('001.3');

  await tracks.getByRole('button', { name: 'Play' }).click();
  await expect(tracks.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(position).not.toHaveText('001.3');
});

test('the skip link is the first Tab stop and moves on to the content', async ({ page }) => {
  await openPage(page, '/docs/guide');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#content$/u);
  const main = page.getByRole('main');
  await expect(main).toHaveAttribute('id', 'content');
  // The next Tab stop is in the content, past the navigation.
  await page.keyboard.press('Tab');
  await expect(main.locator(':focus')).toHaveCount(1);
});

test('the sidebar marks the current page and goes to another one', async ({ page }) => {
  await openPage(page, '/docs/guide/installation');
  const docs = page.getByRole('navigation', { name: 'Docs' });
  const installation = docs.getByRole('link', { name: 'Installation' });
  await expect(installation).toHaveAttribute('aria-current', 'page');

  const themes = docs.getByRole('link', { name: 'Themes' });
  await themes.click();
  await expect(page).toHaveURL('/docs/guide/themes');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Themes');
  await expect(themes).toHaveAttribute('aria-current', 'page');
  await expect(installation).not.toHaveAttribute('aria-current');
});

test('the sidebar collapses, stays collapsed after a reload, and expands', async ({ page }) => {
  await openPage(page, '/docs/guide');
  const docs = page.getByRole('navigation', { name: 'Docs' });
  const collapse = page.getByRole('banner').getByRole('button', { name: 'Collapse sidebar' });
  const expand = page.getByRole('banner').getByRole('button', { name: 'Expand sidebar' });
  await collapse.click();
  await expect(docs).toBeHidden();
  // The button pressed is gone: the focus moves to the one that undoes it.
  await expect(expand).toBeFocused();

  await reloadPage(page);
  await expect(docs).toBeHidden();
  await expand.click();
  await expect(docs).toBeVisible();
  await expect(collapse).toBeFocused();
});

test('the section switcher goes to another section', async ({ page }) => {
  await openPage(page, '/docs/guide');
  const banner = page.getByRole('banner');
  await banner.getByRole('button', { name: 'Guide', exact: true }).click();
  const sections = page.getByRole('dialog', { name: 'Sections' });
  await expect(sections.getByRole('link', { name: 'Guide', exact: true })).toHaveAttribute(
    'aria-current',
    'true',
  );

  await sections.getByRole('link', { name: 'Kit', exact: true }).click();
  await expect(page).toHaveURL('/docs/kit');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kit');
  await expect(sections).toBeHidden();
  // The switcher now shows the new section, and has the focus back.
  await expect(banner.getByRole('button', { name: 'Kit', exact: true })).toBeFocused();
});

test('the previous and next links follow the order of the section', async ({ page }) => {
  await openPage(page, '/docs/guide');
  const neighbours = page.getByRole('navigation', { name: 'Previous and next page' });
  // The first page of the section has no previous one.
  await expect(neighbours.getByRole('link', { name: /^Previous/u })).toHaveCount(0);

  await neighbours.getByRole('link', { name: /^Next/u }).click();
  await expect(page).toHaveURL('/docs/guide/installation');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Installation');

  await neighbours.getByRole('link', { name: /^Next/u }).click();
  await expect(page).toHaveURL('/docs/guide/themes');
  await neighbours.getByRole('link', { name: /^Previous/u }).click();
  await expect(page).toHaveURL('/docs/guide/installation');
});
