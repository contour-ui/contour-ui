// No 'use client' and no runtime import of Kit's main entry: React Server Components call
// `docsScript()` in the root layout, and Kit's entry creates contexts as it loads.
import type { ThemeScriptOptions } from '@contour-ui/kit';
import { themeScript } from '@contour-ui/kit/theme-script';

import { DEFAULT_SIDEBAR_STORAGE_KEY, sidebarScript } from '../layout/sidebar-state.ts';

/**
 * The options `DocsProvider` and `docsScript()` share. Give both the same values, so the script
 * sets the state the provider then keeps.
 */
export interface DocsScriptOptions {
  /** The options of Kit's theme: the default theme, its `localStorage` key, its attribute. */
  readonly theme?: ThemeScriptOptions | undefined;
  /**
   * The `localStorage` key that remembers a collapsed sidebar.
   *
   * @defaultValue 'contour-docs-sidebar'
   */
  readonly sidebarStorageKey?: string | undefined;
}

/**
 * The source of an inline script that sets, on `<html>`, before the page is first painted, what
 * only the browser knows: the theme (Kit's `themeScript()`) and a collapsed sidebar
 * (`data-contour-docs-sidebar="collapsed"`). The layouts render both states, and CSS shows the
 * one these attributes ask for, so a page rendered on the server neither flashes nor hydrates
 * differently.
 *
 * Render it in `<head>`, before the stylesheets, with the options `DocsProvider` gets, and let
 * React leave the attributes of `<html>` alone (`suppressHydrationWarning`). The source is the
 * same for the same options, so a Content Security Policy can allow it by its hash.
 *
 * @example
 * <html lang="en" suppressHydrationWarning>
 *   <head>
 *     <script dangerouslySetInnerHTML={{ __html: docsScript() }} />
 *   </head>
 *   <body>
 *     <DocsProvider site={site}>{children}</DocsProvider>
 *   </body>
 * </html>
 */
export function docsScript({
  theme,
  sidebarStorageKey = DEFAULT_SIDEBAR_STORAGE_KEY,
}: DocsScriptOptions = {}): string {
  return `${themeScript(theme)}${sidebarScript(sidebarStorageKey)}`;
}
