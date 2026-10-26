import { flattenTree, getPageTreeRoots } from 'fumadocs-core/page-tree';
import type { Folder, Root } from 'fumadocs-core/page-tree';

/**
 * The sections of the docs: the root folders of the page tree (`"root": true` in their
 * `meta.json`: Guide, Kit, Audio, Headless), in the order of the tree.
 */
export function getSections(tree: Root): Folder[] {
  return getPageTreeRoots(tree).filter((node): node is Folder => node.type === 'folder');
}

/** The section of the page at `url`, or `undefined` for a page outside them, such as `/docs`. */
export function findSection(sections: readonly Folder[], url: string): Folder | undefined {
  return sections.find(
    (section) =>
      section.index?.url === url || flattenTree(section.children).some((page) => page.url === url),
  );
}

/** Where a section starts: its index page, or else its first page. */
export function getSectionUrl(section: Folder): string | undefined {
  return section.index?.url ?? flattenTree(section.children)[0]?.url;
}
