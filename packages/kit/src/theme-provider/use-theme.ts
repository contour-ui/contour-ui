import type { Theme } from '@contour-ui/tokens';
import { createContext, use } from 'react';
import type { Context } from 'react';

import type { ThemeChoice } from './theme-options.ts';

/** What {@link useTheme} returns: the theme of the page and the way to change it. */
export interface UseThemeReturn {
  /**
   * The user's choice: `'light'`, `'dark'` or `'system'`, and `defaultTheme` until they make one.
   * `undefined` on the server and in the render that hydrates its HTML, since the stored choice
   * is only known in the browser.
   */
  readonly theme: ThemeChoice | undefined;
  /**
   * The theme in use, one of the `themes` of `@contour-ui/tokens`: the choice, with `'system'`
   * resolved to the color scheme of the operating system. `undefined` where `theme` is.
   */
  readonly resolvedTheme: Theme | undefined;
  /** Choose a theme: the provider stores the choice and applies it to `<html>`. */
  readonly setTheme: (theme: ThemeChoice) => void;
}

/** The theme of the outermost `ThemeProvider`. */
export const ThemeContext: Context<UseThemeReturn | null> = createContext<UseThemeReturn | null>(
  null,
);

/**
 * The theme of the page, from `ThemeProvider`: the user's choice (`theme`), the theme in use
 * (`resolvedTheme`) and `setTheme`. Throws outside a provider.
 *
 * Both values are `undefined` on the server and in the render that hydrates the server's HTML,
 * and known from the next render on: render what depends on them once they are, or style it
 * by the theme attribute of `<html>` instead.
 *
 * @example
 * function ThemeToggle(): ReactElement {
 *   const { resolvedTheme, setTheme } = useTheme();
 *   return (
 *     <IconButton
 *       label="Toggle theme"
 *       icon={resolvedTheme === 'light' ? sunIcon : moonIcon}
 *       onClick={() => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')}
 *     />
 *   );
 * }
 */
export function useTheme(): UseThemeReturn {
  const context = use(ThemeContext);
  if (context === null) {
    throw new Error('useTheme: render the component inside <ThemeProvider>.');
  }
  return context;
}
