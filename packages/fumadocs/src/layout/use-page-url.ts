'use client';

import { usePathname } from 'fumadocs-core/framework';
import type { Root } from 'fumadocs-core/page-tree';

import { toPageUrl, toTreeUrl } from './page-url.ts';

/**
 * The URL of the page on screen, as the page tree has it, from the framework's pathname: a page
 * left out of the tree takes the URL of its nearest ancestor in it.
 */
export function usePageUrl(tree: Root): string {
  return toTreeUrl(tree, toPageUrl(usePathname()));
}
