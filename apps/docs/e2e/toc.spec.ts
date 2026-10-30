import type { Page } from '@playwright/test';

import { expect, openPage, test } from './fixtures.ts';

/** Scroll a section heading of the page to the top of the viewport, at once. */
async function scrollToHeading(page: Page, name: string): Promise<void> {
  await page.getByRole('heading', { level: 2, name }).evaluate((heading) => {
    heading.scrollIntoView({ block: 'start', behavior: 'instant' });
  });
}

test.describe('the column, on wide screens', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('marks the heading scrolled to as current', async ({ page }) => {
    await openPage(page, '/docs/components/button');
    const toc = page.getByRole('navigation', { name: 'On this page' });
    const anatomy = toc.getByRole('link', { name: 'Anatomy' });
    const props = toc.getByRole('link', { name: 'Props' });

    await scrollToHeading(page, 'Anatomy');
    await expect(anatomy).toHaveAttribute('aria-current', 'true');
    await scrollToHeading(page, 'Props');
    await expect(props).toHaveAttribute('aria-current', 'true');
    await expect(anatomy).not.toHaveAttribute('aria-current');
  });

  test('a link scrolls to its heading and moves the focus there', async ({ page }) => {
    await openPage(page, '/docs/components/button');
    const props = page
      .getByRole('navigation', { name: 'On this page' })
      .getByRole('link', { name: 'Props' });
    await props.click();
    await expect(page).toHaveURL(/#props$/u);
    const heading = page.getByRole('heading', { level: 2, name: 'Props' });
    await expect(heading).toBeInViewport();
    await expect(heading).toBeFocused();
    await expect(props).toHaveAttribute('aria-current', 'true');
  });
});

test.describe('the bar, on narrow screens', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('lists the headings, and a link goes to its heading', async ({ page }) => {
    await openPage(page, '/docs/components/button');
    // Its name goes on with the current heading.
    const bar = page.getByRole('button', { name: 'On this page' });
    await bar.click();
    const popover = page.getByRole('dialog', { name: 'On this page' });
    await popover.getByRole('link', { name: 'Props' }).click();
    await expect(popover).toBeHidden();
    await expect(page).toHaveURL(/#props$/u);
    const heading = page.getByRole('heading', { level: 2, name: 'Props' });
    await expect(heading).toBeInViewport();
    await expect(heading).toBeFocused();
    // Not under the sticky header and bar.
    await expect
      .poll(async () => {
        const [barBox, headingBox] = await Promise.all([bar.boundingBox(), heading.boundingBox()]);
        return barBox !== null && headingBox !== null && headingBox.y >= barBox.y + barBox.height;
      })
      .toBe(true);
  });
});
