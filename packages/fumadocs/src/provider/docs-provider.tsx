'use client';

import { ThemeProvider } from '@contour-ui/react';
import type { ThemeProviderProps } from '@contour-ui/react';
import { useMemo } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { DEFAULT_SIDEBAR_STORAGE_KEY, setSidebarCollapsed } from '../layout/sidebar-state.ts';
import { SearchProvider } from '../search/search-provider.tsx';
import { DocsContext } from './docs-context.ts';
import type { DocsContextValue, DocsSite, DocsThemeToggleOptions } from './docs-context.ts';
import type { DocsScriptOptions } from './docs-script.ts';

/** The search of the site: fumadocs-core's static search, in the browser. */
export interface DocsSearchOptions {
  /**
   * The URL of the search index that fumadocs-core's search server exports
   * (`createFromSource(source).staticGET()`), downloaded as the search first opens.
   *
   * @defaultValue '/api/search'
   */
  readonly from?: string | undefined;
}

export interface DocsProviderProps extends DocsScriptOptions {
  /** The site: its name and its links, in the headers and the sidebar. */
  readonly site: DocsSite;
  /**
   * The search: the triggers in the layouts, the dialog and the shortcut (⌘K, Ctrl K), on by
   * default. `false` leaves it out.
   */
  readonly search?: DocsSearchOptions | false | undefined;
  /** The options of Kit's `ThemeProvider`; give `docsScript()` the same. */
  readonly theme?: Omit<ThemeProviderProps, 'children'> | undefined;
  /**
   * The theme toggle of the layouts: `{ mode: 'light-dark-system' }` offers the theme of the
   * operating system next to the light and the dark one.
   */
  readonly themeToggle?: DocsThemeToggleOptions | undefined;
  readonly children?: ReactNode;
}

/**
 * What the layouts of this package need around them, once at the root of the app, inside the
 * adapter of its framework (`ReactRouterProvider` from `fumadocs-core/framework/react-router`,
 * `NextProvider`…), which gives them the links, the pathname and the router: Kit's
 * `ThemeProvider`, the site, and the search, whose dialog it renders after its children. Render
 * `docsScript()` in `<head>` with the same options.
 *
 * @example
 * const site: DocsSite = {
 *   name: 'My docs',
 *   nav: [{ label: 'Docs', href: '/docs' }],
 *   links: [{ label: 'GitHub', href: 'https://github.com/me/my-docs', icon: githubIcon }],
 * };
 *
 * <ReactRouterProvider>
 *   <DocsProvider site={site}>{children}</DocsProvider>
 * </ReactRouterProvider>
 */
export function DocsProvider({
  site,
  search,
  theme,
  themeToggle,
  sidebarStorageKey = DEFAULT_SIDEBAR_STORAGE_KEY,
  children,
}: DocsProviderProps): ReactElement {
  const themeToggleMode = themeToggle?.mode ?? 'light-dark';
  const docs = useMemo<DocsContextValue>(
    () => ({
      site,
      setSidebarCollapsed: (collapsed) => {
        setSidebarCollapsed(collapsed, sidebarStorageKey);
      },
      themeToggleMode,
    }),
    [site, sidebarStorageKey, themeToggleMode],
  );

  return (
    <ThemeProvider {...theme}>
      <DocsContext value={docs}>
        {search === false ? (
          children
        ) : (
          <SearchProvider from={search?.from}>{children}</SearchProvider>
        )}
      </DocsContext>
    </ThemeProvider>
  );
}
