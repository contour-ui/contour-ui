/**
 * axe on the kinds of page (home, guide, component, one with tabs: code block tabs, install
 * commands and MDX tabs, and the Tokens page, which shows both themes side by side) and on the
 * overlays of the layout, in both themes: color contrast differs between them.
 */
import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { expect, openPage, test } from './fixtures.ts';

const PAGES = [
  '/',
  '/docs/guide',
  '/docs/essentials/button',
  '/docs/fumadocs/mdx',
  '/docs/guide/tokens',
];

/**
 * The rules to run: WCAG 2.0, 2.1 and 2.2 at levels A and AA, the level the site is built to,
 * and axe's best practices, which judge the page as a whole: landmarks, one `main`, one `h1`,
 * the order of headings. That is every rule axe runs by default, as the screenshot tests check every
 * the packages do, plus WCAG 2.2's target size (2.5.8), which axe leaves off by default. Rules
 * for AAA stay off: the site does not aim at that level.
 */
const RULE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** The violations axe finds on the page, one line each: the rule, what it asks, the elements. */
async function axeViolations(page: Page): Promise<string[]> {
  // Colors are checked as they end up: an overlay fades in. Endless animations never finish. A
  // cancelled animation rejects `finished` and may hand over to another one, so this waits again
  // until no finite animation runs.
  await page.evaluate(async () => {
    const settle = async (rounds: number): Promise<void> => {
      const running = document
        .getAnimations()
        .filter(
          (animation) =>
            animation.playState === 'running' &&
            animation.effect?.getComputedTiming().endTime !== Infinity,
        );
      if (running.length === 0 || rounds === 0) {
        return;
      }
      await Promise.allSettled(running.map((animation) => animation.finished));
      await settle(rounds - 1);
    };
    await settle(10);
  });
  const { violations } = await new AxeBuilder({ page }).withTags(RULE_TAGS).analyze();
  return violations.map(
    ({ id, help, nodes }) =>
      `${id}: ${help} (${nodes.map((node) => node.target.join(' ')).join(', ')})`,
  );
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    for (const width of [390, 1280]) {
      for (const url of PAGES) {
        test(`${url} at ${width}px`, async ({ page }) => {
          await page.setViewportSize({ width, height: 800 });
          await openPage(page, url);
          await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
          expect(await axeViolations(page)).toEqual([]);
        });
      }
    }

    test('the search dialog with results', async ({ page }) => {
      await openPage(page, '/docs/guide');
      await page.keyboard.press('ControlOrMeta+K');
      const dialog = page.getByRole('dialog', { name: 'Search' });
      await dialog.getByRole('combobox', { name: 'Search the docs' }).fill('button');
      await expect(dialog.getByRole('option').first()).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);
    });

    test('the menu at 390px', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await openPage(page, '/docs/guide');
      await page.getByRole('banner').getByRole('button', { name: 'Open menu' }).click();
      await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
      expect(await axeViolations(page)).toEqual([]);
    });
  });
}
