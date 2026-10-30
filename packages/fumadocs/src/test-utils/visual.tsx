import { defaultTheme, themeAttribute, themes, vars } from '@contour-ui/tokens';
import type { Theme } from '@contour-ui/tokens';
import { defineVisualStates } from '@contour-ui/vite-config/visual';

import { DocsProvider } from '../index.ts';
import type { ThemeToggleMode } from '../index.ts';
import { MemoryFramework } from './framework.tsx';
import { createSearchIndexUrl } from './search-index.ts';
import { site } from './site.ts';

import '@contour-ui/tokens/tokens.css';
import '@contour-ui/tokens/fonts.css';
// Before the styled components: its first rule is the order of the cascade layers, theirs included.
import '../styles.css';
import '@contour-ui/react/styles.css';

/** The page a state shows, unless its `pathname` parameter names another one. */
const DEFAULT_PATHNAME = '/docs/essentials/button';

/** The `localStorage` keys `DocsProvider` keeps the theme and the sidebar under, by default. */
const STORAGE_KEYS = ['contour-theme', 'contour-docs-sidebar'] as const;

/** The groups of tabs of the fixtures, which remember a tab in both storages under their id. */
const TAB_GROUPS = ['language', 'framework'] as const;

/** The attribute of `<html>` that collapses the sidebar (`docsScript()`). */
const SIDEBAR_ATTRIBUTE = 'data-contour-docs-sidebar';

/** The mode of the theme toggle a state asks for (its `themeToggle` parameter), if any. */
function themeToggleMode(value: unknown): ThemeToggleMode | undefined {
  return value === 'light-dark' || value === 'light-dark-system' ? value : undefined;
}

/** The theme of the test, as the type of the tokens. */
function asTheme(value: string): Theme {
  return themes.find((theme) => theme === value) ?? defaultTheme;
}

/** The URL of the search index of the fixtures, made once for the page. */
let searchFrom: string | undefined;

/**
 * Screenshot tests of this package (`*.visual.test.tsx`): each state as a page of the docs site
 * of the fixtures, in every theme, checked with axe in the default one. A state renders inside
 * fumadocs-core's framework (`MemoryFramework`) at its `pathname` parameter, so links go to the
 * pages of `pageTree` without leaving the page, and inside `DocsProvider`, with the search on the
 * index of the fixtures, the theme of the test and the mode of the theme toggle of its
 * `themeToggle` parameter. Every state starts afresh: nothing stored, the sidebar expanded.
 *
 * @example
 * visualStates({ guide: { render: () => <Page />, params: { pathname: '/docs/guide' } } });
 */
export const visualStates = defineVisualStates({
  themes,
  defaultTheme,
  attribute: themeAttribute,
  canvas: {
    background: vars.color.bg.canvas,
    color: vars.color.fg.default,
    font: vars.text.body.font,
    letterSpacing: vars.text.body.letterSpacing,
  },
  setup: async () => {
    for (const key of STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    for (const group of TAB_GROUPS) {
      localStorage.removeItem(group);
      sessionStorage.removeItem(group);
    }
    document.documentElement.removeAttribute(SIDEBAR_ATTRIBUTE);
    searchFrom ??= await createSearchIndexUrl();
  },
  wrap: (ui, { theme, params }) => {
    const value = params['pathname'];
    const pathname = typeof value === 'string' ? value : DEFAULT_PATHNAME;
    return (
      // A new page for another pathname, as every state starts afresh.
      <MemoryFramework key={pathname} pathname={pathname}>
        <DocsProvider
          site={site}
          search={searchFrom === undefined ? false : { from: searchFrom }}
          theme={{ defaultTheme: asTheme(theme) }}
          themeToggle={{ mode: themeToggleMode(params['themeToggle']) }}
        >
          {ui}
        </DocsProvider>
      </MemoryFramework>
    );
  },
});
