import type { Folder } from 'fumadocs-core/page-tree';
import { describe, expect, it } from 'vite-plus/test';

import { pageTree } from '../test-utils/page-tree.ts';
import { toPageUrl } from './page-url.ts';
import { findSection, getSections, getSectionUrl } from './sections.ts';

const sections = getSections(pageTree);

describe('getSections', () => {
  it('gives the root folders of the tree, in its order', () => {
    expect(sections.map((section) => section.name)).toEqual(['Guide', 'Essentials']);
  });
});

describe('findSection', () => {
  it('finds the section of a page, in a folder of its own too', () => {
    expect(findSection(sections, '/docs/guide/themes')?.name).toBe('Guide');
    expect(findSection(sections, '/docs/essentials')?.name).toBe('Essentials');
    expect(findSection(sections, '/docs/essentials/forms')?.name).toBe('Essentials');
    expect(findSection(sections, '/docs/essentials/forms/select')?.name).toBe('Essentials');
  });

  it('finds none for a page outside the sections', () => {
    expect(findSection(sections, '/docs')).toBeUndefined();
    expect(findSection(sections, '/docs/nope')).toBeUndefined();
  });
});

/** The pages of a folder: a separator first, then a page. */
const FOLDER_PAGES: Folder['children'] = [
  { type: 'separator', name: 'Start' },
  { type: 'page', name: 'First', url: '/docs/folder/first' },
];

describe('getSectionUrl', () => {
  it('leads to the index page of a section, or else to its first page', () => {
    const indexed: Folder = {
      type: 'folder',
      name: 'Folder',
      index: { type: 'page', name: 'Index', url: '/docs/folder' },
      children: FOLDER_PAGES,
    };
    const unindexed: Folder = { type: 'folder', name: 'Folder', children: FOLDER_PAGES };

    expect(sections.map((section) => getSectionUrl(section))).toEqual([
      '/docs/guide',
      '/docs/essentials',
    ]);
    expect(getSectionUrl(indexed)).toBe('/docs/folder');
    expect(getSectionUrl(unindexed)).toBe('/docs/folder/first');
    expect(getSectionUrl({ type: 'folder', name: 'Empty', children: [] })).toBeUndefined();
  });
});

describe('toPageUrl', () => {
  it('takes a trailing slash off a pathname, as the page tree has none', () => {
    expect(toPageUrl('/docs/essentials/')).toBe('/docs/essentials');
    expect(toPageUrl('/docs/essentials')).toBe('/docs/essentials');
    expect(toPageUrl('/')).toBe('/');
  });
});
