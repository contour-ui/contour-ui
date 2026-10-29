import { themes } from '@contour-ui/tokens';
import type { Theme } from '@contour-ui/tokens';

/**
 * A theme as the user chooses it: one of the `themes` of `@contour-ui/tokens`, or `'system'` to
 * follow the color scheme of the operating system.
 */
export type ThemeChoice = Theme | 'system';

/**
 * The options `ThemeProvider` and `themeScript()` share. Give both the same values, so the script
 * sets the theme the provider then keeps.
 */
export interface ThemeScriptOptions {
  /**
   * The choice until the user makes one.
   *
   * @defaultValue 'system'
   */
  defaultTheme?: ThemeChoice | undefined;
  /**
   * The `localStorage` key the choice is stored under.
   *
   * @defaultValue 'contour-theme'
   */
  storageKey?: string | undefined;
  /**
   * The attribute of `<html>` that holds the theme in use. The token stylesheet reads
   * `data-theme`, `themeAttribute` of `@contour-ui/tokens`.
   *
   * @defaultValue 'data-theme'
   */
  attribute?: `data-${string}` | undefined;
}

/** The default of `defaultTheme`: follow the operating system. */
export const DEFAULT_THEME: ThemeChoice = 'system';

/** The default of `storageKey`. */
export const DEFAULT_STORAGE_KEY = 'contour-theme';

/** The media query that tells the system theme: `dark` when it matches, `light` otherwise. */
export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

/** Whether a stored value is a choice: anything else, such as a theme that no longer exists, is ignored. */
export function isThemeChoice(value: string | null): value is ThemeChoice {
  return value === 'system' || themes.some((theme) => theme === value);
}
