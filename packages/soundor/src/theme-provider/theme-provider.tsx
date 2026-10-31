import { defaultTheme as tokensDefaultTheme } from '@contour-ui/tokens';
import type { Theme } from '@contour-ui/tokens';
import { soundorTokens } from '@contour-ui/tokens/soundor';
import { use, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { ThemeContext } from './use-theme.ts';
import type { UseThemeReturn } from './use-theme.ts';

export interface ThemeProviderProps {
  /**
   * The theme until `setTheme` chooses another. Read once, on mount.
   *
   * @defaultValue 'dark', `defaultTheme` of `@contour-ui/tokens`
   */
  readonly defaultTheme?: Theme | undefined;
  readonly children?: ReactNode;
}

function RootThemeProvider({
  defaultTheme = tokensDefaultTheme,
  children,
}: ThemeProviderProps): ReactElement {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const value = useMemo<UseThemeReturn>(
    () => ({ theme, resolvedTheme: theme, tokens: soundorTokens[theme], setTheme }),
    [theme],
  );
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

/**
 * Keeps the theme of the plugin view: the components below it draw with the token values of
 * that theme, `defaultTheme` until `setTheme` chooses another. Read and change the theme with
 * {@link useTheme}. A provider inside another one passes the outer theme on.
 *
 * Soundor has no color scheme of the system to follow, and the choice is not stored yet: a
 * plugin that keeps it passes it back as `defaultTheme`.
 *
 * @example
 * render(
 *   <ThemeProvider defaultTheme="light">
 *     <App />
 *   </ThemeProvider>,
 * );
 */
export function ThemeProvider(props: ThemeProviderProps): ReactElement {
  const outer = use(ThemeContext);
  if (outer !== null) {
    // The theme of the outer provider goes on unchanged.
    return <ThemeContext value={outer}>{props.children}</ThemeContext>;
  }
  return <RootThemeProvider {...props} />;
}
