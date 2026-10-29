'use client';

import { themeAttribute } from '@contour-ui/tokens';
import type { Theme } from '@contour-ui/tokens';
import { use, useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import type { ReactElement, ReactNode } from 'react';

import {
  applyTheme,
  getSystemTheme,
  readStoredChoice,
  storeChoice,
  subscribeToStorage,
  subscribeToSystemTheme,
} from './theme-dom.ts';
import { DEFAULT_STORAGE_KEY, DEFAULT_THEME, isThemeChoice } from './theme-options.ts';
import type { ThemeChoice, ThemeScriptOptions } from './theme-options.ts';
import { ThemeContext } from './use-theme.ts';
import type { UseThemeReturn } from './use-theme.ts';

export interface ThemeProviderProps extends ThemeScriptOptions {
  /**
   * Turn CSS transitions off while the theme switches, so every color changes at once rather
   * than each at the pace of its own transition.
   *
   * @defaultValue true
   */
  disableTransitionOnChange?: boolean | undefined;
  children?: ReactNode;
}

/**
 * The stored choice of one provider: read from `localStorage` on first use, then kept in memory,
 * so a choice holds for the page where the browser blocks the storage.
 */
interface ChoiceStore {
  readonly subscribe: (onChange: () => void) => () => void;
  /** The choice, or `null` while the user has made none. */
  readonly get: () => ThemeChoice | null;
  readonly set: (choice: ThemeChoice) => void;
}

function createChoiceStore(key: string): ChoiceStore {
  // `undefined` until the storage is read.
  let choice: ThemeChoice | null | undefined;
  const listeners = new Set<() => void>();
  const change = (next: ThemeChoice | null): void => {
    if (next === choice) {
      return;
    }
    choice = next;
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    subscribe: (onChange) => {
      listeners.add(onChange);
      // Another tab chose a theme, or cleared the storage.
      const unsubscribe = subscribeToStorage(key, () => {
        change(readStoredChoice(key));
      });
      return () => {
        listeners.delete(onChange);
        unsubscribe();
      };
    },
    get: () => {
      if (choice === undefined) {
        choice = readStoredChoice(key);
      }
      return choice;
    },
    set: (next) => {
      // A JavaScript caller may pass anything; the stored value must stay a choice.
      if (!isThemeChoice(next)) {
        return;
      }
      storeChoice(key, next);
      change(next);
    },
  };
}

/** The server snapshot of both stores: the server knows neither the storage nor the system. */
const unknownOnServer = (): undefined => undefined;

function DocumentThemeProvider({
  defaultTheme = DEFAULT_THEME,
  storageKey = DEFAULT_STORAGE_KEY,
  attribute = themeAttribute,
  disableTransitionOnChange = true,
  children,
}: ThemeProviderProps): ReactElement {
  const store = useMemo(() => createChoiceStore(storageKey), [storageKey]);
  // On the server and in the hydration render, React reads the server snapshots, so the
  // hydration matches the server's HTML; right after it, React renders again with the browser's.
  const stored = useSyncExternalStore<ThemeChoice | null | undefined>(
    store.subscribe,
    store.get,
    unknownOnServer,
  );
  const systemTheme = useSyncExternalStore<Theme | undefined>(
    subscribeToSystemTheme,
    getSystemTheme,
    unknownOnServer,
  );
  const theme = stored === undefined ? undefined : (stored ?? defaultTheme);
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  // Before the browser paints: an app rendered only in the browser shows the right theme at once.
  useLayoutEffect(() => {
    if (resolvedTheme !== undefined) {
      applyTheme(attribute, resolvedTheme, disableTransitionOnChange);
    }
  }, [attribute, resolvedTheme, disableTransitionOnChange]);

  const value = useMemo<UseThemeReturn>(
    () => ({ theme, resolvedTheme, setTheme: store.set }),
    [theme, resolvedTheme, store],
  );
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

/**
 * Keeps the theme of the page on `<html>`, as the `data-theme` attribute the token stylesheet
 * reads: the user's choice, stored in `localStorage`, or `defaultTheme` until they make one.
 * `'system'` follows the color scheme of the operating system as it changes, and other tabs of
 * the site follow a new choice. Read and change the theme with {@link useTheme}.
 *
 * Render it once, around the whole app: a provider inside another one changes nothing and
 * leaves the theme to the outer one. On a page rendered on the server, add the script of
 * `themeScript()` to `<head>`, so the theme is right before the first paint, and
 * `suppressHydrationWarning` to `<html>`, whose attribute the script sets.
 *
 * @example
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 */
export function ThemeProvider(props: ThemeProviderProps): ReactElement {
  const outer = use(ThemeContext);
  if (outer !== null) {
    // The theme of the outer provider goes on unchanged.
    return <ThemeContext value={outer}>{props.children}</ThemeContext>;
  }
  return <DocumentThemeProvider {...props} />;
}
