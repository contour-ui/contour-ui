import { defaultTheme } from '@contour-ui/tokens';
import type { Theme } from '@contour-ui/tokens';
import { soundorTokens } from '@contour-ui/tokens/soundor';
import type { SoundorTokens } from '@contour-ui/tokens/soundor';
import { createContext, use } from 'react';
import type { Context } from 'react';

/** What {@link useTheme} returns: the theme of the view, its token values and the way to change it. */
export interface UseThemeReturn {
  /** The theme in use, one of the `themes` of `@contour-ui/tokens`. */
  readonly theme: Theme;
  /**
   * The same as `theme`: Soundor has no color scheme of the system to resolve a choice against.
   * It keeps code written for `useTheme` of `@contour-ui/react` working.
   */
  readonly resolvedTheme: Theme;
  /** The values of the tokens in the theme, from `@contour-ui/tokens/soundor`. */
  readonly tokens: SoundorTokens;
  /** Choose a theme. */
  readonly setTheme: (theme: Theme) => void;
}

/** The theme of the outermost `ThemeProvider`. */
export const ThemeContext: Context<UseThemeReturn | null> = createContext<UseThemeReturn | null>(
  null,
);

/**
 * The theme of the view, from `ThemeProvider`: the theme in use, the values of its tokens and
 * `setTheme`. Throws outside a provider.
 *
 * @example
 * function ThemeToggle(): ReactElement {
 *   const { theme, setTheme } = useTheme();
 *   return (
 *     <Pressable onPress={() => { setTheme(theme === 'light' ? 'dark' : 'light'); }}>
 *       <Text>Theme</Text>
 *     </Pressable>
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

/**
 * The token values a component draws with: those of the provider's theme, or of the default
 * theme outside a provider, so a component renders without one.
 */
export function useTokens(): SoundorTokens {
  return use(ThemeContext)?.tokens ?? soundorTokens[defaultTheme];
}
