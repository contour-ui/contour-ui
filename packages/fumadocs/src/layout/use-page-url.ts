'use client';

import { usePathname } from 'fumadocs-core/framework';

import { toPageUrl } from './page-url.ts';

/** The URL of the page on screen, as the page tree has it, from the framework's pathname. */
export function usePageUrl(): string {
  return toPageUrl(usePathname());
}
