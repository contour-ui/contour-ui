import { defaultTheme as stylesheetTheme, themeAttribute, themes } from '@contour-ui/tokens';

import { DARK_SCHEME_QUERY, DEFAULT_STORAGE_KEY, DEFAULT_THEME } from './theme-options.ts';
import type { ThemeScriptOptions } from './theme-options.ts';

/**
 * The script, a function of its settings. It runs before any module of the page, so it uses
 * nothing but its arguments and the globals it guards, and decides as `ThemeProvider` does: the
 * stored choice when it is one of `choices`, or else the default; `system` resolved by the media
 * query, or to the stylesheet's default theme where `matchMedia` is missing.
 */
const SCRIPT = `(key, attribute, theme, choices, query, fallback) => {
  try {
    const stored = localStorage.getItem(key);
    if (choices.includes(stored)) theme = stored;
  } catch {}
  if (theme === 'system') {
    theme = typeof matchMedia === 'function' ? (matchMedia(query).matches ? 'dark' : 'light') : fallback;
  }
  document.documentElement.setAttribute(attribute, theme);
}`;

/**
 * `value` as a JavaScript literal that is safe inside an HTML `<script>`: its JSON, with every `<`
 * escaped, so no `</script>` in a string ends the element early.
 */
function literal(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

/**
 * The source of an inline script that sets the theme on `<html>` before the page is first
 * painted: the choice stored by `ThemeProvider`, or `defaultTheme`, with `'system'` resolved by
 * `prefers-color-scheme`. Without it, a page rendered on the server shows the default theme of the
 * stylesheet (dark) until the provider runs, a flash for everyone who chose light.
 *
 * Render it in `<head>`, before anything that paints, and pass the options the provider gets.
 * Reading the storage cannot break it: where the browser blocks `localStorage`, it applies the
 * default. The source is the same for the same options and version of `@contour-ui/react`, so a
 * Content Security Policy can allow it by its hash, or by the nonce of its `<script>`.
 *
 * @example
 * <html lang="en" suppressHydrationWarning>
 *   <head>
 *     <script dangerouslySetInnerHTML={{ __html: themeScript() }} />
 *   </head>
 *   <body>
 *     <ThemeProvider>{children}</ThemeProvider>
 *   </body>
 * </html>
 */
export function themeScript({
  defaultTheme = DEFAULT_THEME,
  storageKey = DEFAULT_STORAGE_KEY,
  attribute = themeAttribute,
}: ThemeScriptOptions = {}): string {
  const settings = [
    storageKey,
    attribute,
    defaultTheme,
    ['system', ...themes],
    DARK_SCHEME_QUERY,
    stylesheetTheme,
  ];
  return `(${SCRIPT})(${settings.map((setting) => literal(setting)).join(', ')});`;
}
