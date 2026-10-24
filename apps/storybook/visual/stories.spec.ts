/**
 * Visual regression for the package Storybooks: every story tagged `visual`
 * (the styled packages tag all their stories; `tags: ['!visual']` opts one out),
 * screenshotted in each theme from the composed static build.
 *
 * Screenshots are only comparable where they were made: in the pinned Playwright
 * Linux image (`vp run visual` locally, the `visual` job in CI).
 */
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

import { themes } from '@contour-ui/tokens';
import { expect, test } from '@playwright/test';

import { PACKAGE_STORYBOOKS } from '../refs.ts';
import { STATIC_DIR } from './site.ts';

const SNAPSHOT_DIR = path.join(import.meta.dirname, '__snapshots__');

interface VisualStory {
  readonly id: string;
  readonly title: string;
  readonly name: string;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null;

/** Stories tagged `visual` in a package Storybook's `index.json`. */
function visualStories(storybook: string): VisualStory[] {
  const file = path.join(STATIC_DIR, storybook, 'index.json');
  if (!existsSync(file)) {
    throw new Error(`Missing ${file}: run \`vp run build-storybook\` first.`);
  }
  const index: unknown = JSON.parse(readFileSync(file, 'utf8'));
  const entries = isRecord(index) && isRecord(index['entries']) ? index['entries'] : {};
  return Object.values(entries).flatMap((entry): VisualStory[] => {
    if (!isRecord(entry) || entry['type'] !== 'story') {
      return [];
    }
    const { id, title, name, tags } = entry;
    return typeof id === 'string' &&
      typeof title === 'string' &&
      typeof name === 'string' &&
      Array.isArray(tags) &&
      tags.includes('visual')
      ? [{ id, title, name }]
      : [];
  });
}

/** Screenshot paths below `__snapshots__/` that the tests below compare against. */
const expected = new Set<string>();

for (const { name: storybook } of PACKAGE_STORYBOOKS) {
  for (const story of visualStories(storybook)) {
    test.describe(`${storybook}: ${story.title} / ${story.name}`, () => {
      for (const theme of themes) {
        expected.add(`${storybook}/${story.id}.${theme}.png`);
        test(theme, async ({ page }) => {
          await page.goto(
            `${storybook}/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`,
          );
          // Storybook shows the story root once it has rendered (an error shows another view).
          await expect(page.locator('body')).toHaveClass(/\bsb-show-main\b/u);
          await page.evaluate(async () => {
            await document.fonts.ready;
          });
          await expect(page).toHaveScreenshot([storybook, `${story.id}.${theme}.png`], {
            fullPage: true,
          });
        });
      }
    });
  }
}

test('no screenshots of removed stories', () => {
  const stale = existsSync(SNAPSHOT_DIR)
    ? readdirSync(SNAPSHOT_DIR, { recursive: true, encoding: 'utf8' })
        .map((file) => file.split(path.sep).join('/'))
        .filter((file) => file.endsWith('.png') && !expected.has(file))
    : [];
  const { updateSnapshots } = test.info().config;
  if (updateSnapshots === 'all' || updateSnapshots === 'changed') {
    for (const file of stale) {
      rmSync(path.join(SNAPSHOT_DIR, file));
    }
    return;
  }
  expect(stale, 'Delete them with `vp run visual:update`.').toEqual([]);
});
