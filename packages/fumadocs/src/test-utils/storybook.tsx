import { defaultTheme, themes } from '@contour-ui/tokens';
import type { Theme } from '@contour-ui/tokens';
import type { Decorator, Preview } from '@storybook/react-vite';

import { DocsProvider } from '../index.ts';
import { MemoryFramework } from './framework.tsx';
import { createSearchIndexUrl } from './search-index.ts';
import { site } from './site.ts';

/** The page a story shows, unless its `pathname` parameter names another one. */
const DEFAULT_PATHNAME = '/docs/kit/button';

/** The `localStorage` keys `DocsProvider` keeps the theme and the sidebar under, by default. */
const STORAGE_KEYS = ['contour-theme', 'contour-docs-sidebar'] as const;

/** The attribute of `<html>` that collapses the sidebar (`docsScript()`). */
const SIDEBAR_ATTRIBUTE = 'data-contour-docs-sidebar';

/** The theme chosen in the toolbar, or the default one when they show side by side. */
function toolbarTheme(value: unknown): Theme {
  return themes.find((theme) => theme === value) ?? defaultTheme;
}

/** The URL of the search index of the fixtures, made once for the page. */
let searchIndexUrl: Promise<string> | undefined;

/**
 * Start every story afresh: nothing stored by the stories before, the sidebar expanded, the
 * search index of the fixtures ready (`loaded.searchFrom`).
 */
export const docsAnnotations: Pick<Preview, 'beforeEach' | 'loaders'> = {
  beforeEach: () => {
    for (const key of STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    document.documentElement.removeAttribute(SIDEBAR_ATTRIBUTE);
  },
  loaders: [
    async () => {
      searchIndexUrl ??= createSearchIndexUrl();
      return { searchFrom: await searchIndexUrl };
    },
  ],
};

/**
 * Render every story as a page of the docs site of the fixtures: inside the framework of
 * fumadocs-core (`MemoryFramework`), at the `pathname` parameter of the story, so links go to
 * the pages of `pageTree` without leaving the canvas, and inside `DocsProvider`, with the search
 * on the index of the fixtures and the theme of the toolbar until a story switches it.
 *
 * @example
 * export const Guide: Story = { parameters: { pathname: '/docs/guide' } };
 */
export const withDocs: Decorator = (Story, { parameters, globals, loaded }) => {
  const value: unknown = parameters['pathname'];
  const pathname = typeof value === 'string' ? value : DEFAULT_PATHNAME;
  const from: unknown = loaded['searchFrom'];
  return (
    // A new page for another pathname, as a story starts afresh.
    <MemoryFramework key={pathname} pathname={pathname}>
      <DocsProvider
        site={site}
        search={typeof from === 'string' ? { from } : false}
        theme={{ defaultTheme: toolbarTheme(globals['theme']) }}
      >
        <Story />
      </DocsProvider>
    </MemoryFramework>
  );
};
