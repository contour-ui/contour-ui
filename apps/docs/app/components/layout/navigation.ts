import type { Folder, Root } from 'fumadocs-core/page-tree';

/**
 * What the navigation of a docs page shows, in the sidebar and in the menu on phones: the sections,
 * the section of the page and its pages.
 */
export interface DocsNavigation {
  /** The page tree of the site. */
  readonly tree: Root;
  /** The sections, the root folders of the tree (`getSections`). */
  readonly sections: readonly Folder[];
  /** The section of the page, or `undefined` for a page outside them, such as `/docs`. */
  readonly section: Folder | undefined;
  /** The URL of the page, as in the tree (`/docs/kit/button`). */
  readonly url: string;
}
