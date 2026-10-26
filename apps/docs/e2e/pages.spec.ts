/**
 * Every docs page, loaded in full: it hydrates without errors and shows its title. Live
 * examples run in the browser here for the first time.
 */
import { globSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { createGetUrl, getSlugs } from 'fumadocs-core/source';

import { expect, openPage, test } from './fixtures.ts';

const CONTENT_DIR = path.resolve(import.meta.dirname, '../content/docs');

/** The URL of a content file, as `react-router.config.ts` prerenders it. */
const getUrl = createGetUrl('/docs');

/** The `title` of a page's frontmatter. */
function titleOf(file: string): string {
  const title = /^---\n(?:.*\n)*?title: (?<title>.+)\n/u.exec(readFileSync(file, 'utf8'))?.groups?.[
    'title'
  ];
  if (title === undefined) {
    throw new Error(`No title in the frontmatter of ${file}`);
  }
  return title;
}

const pages = globSync('**/*.mdx', { cwd: CONTENT_DIR })
  .map((entry) => ({
    url: getUrl(getSlugs(entry)),
    title: titleOf(path.join(CONTENT_DIR, entry)),
  }))
  .toSorted((a, b) => (a.url < b.url ? -1 : 1));

for (const { url, title } of pages) {
  test(url, async ({ page }) => {
    const response = await openPage(page, url);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  });
}
