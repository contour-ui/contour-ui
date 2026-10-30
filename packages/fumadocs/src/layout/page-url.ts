import { flattenTree } from 'fumadocs-core/page-tree';
import type { Root } from 'fumadocs-core/page-tree';

/**
 * The URL of a page as the page tree has it: the pathname without the trailing slash some
 * frameworks keep (Next.js with `trailingSlash`), so `/docs/essentials/` is `/docs/essentials`.
 */
export function toPageUrl(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/**
 * The URL of the page in the tree that `url` belongs to: `url` itself, or else its nearest
 * ancestor in the tree, so a page left out of the tree (a component's `headless` tab) marks
 * its parent as current.
 */
export function toTreeUrl(tree: Root, url: string): string {
  const urls = new Set(flattenTree(tree.children).map((page) => page.url));
  for (let candidate = url; candidate.length > 0;) {
    if (urls.has(candidate)) {
      return candidate;
    }
    candidate = candidate.slice(0, candidate.lastIndexOf('/'));
  }
  return url;
}
