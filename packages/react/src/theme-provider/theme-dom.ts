import { defaultTheme as stylesheetTheme } from '@contour-ui/tokens';
import type { Theme } from '@contour-ui/tokens';

import { DARK_SCHEME_QUERY, isThemeChoice } from './theme-options.ts';
import type { ThemeChoice } from './theme-options.ts';

/**
 * The choice stored under `key`, or `null`: nothing stored, a value that is not a choice, or a
 * storage the browser blocks (reading `localStorage` throws then).
 */
export function readStoredChoice(key: string): ThemeChoice | null {
  try {
    const stored = localStorage.getItem(key);
    return isThemeChoice(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** Store `choice` under `key`, unless the browser blocks the storage or it is full. */
export function storeChoice(key: string, choice: ThemeChoice): void {
  try {
    localStorage.setItem(key, choice);
  } catch {
    // The choice then lasts as long as the page.
  }
}

/**
 * Call `onChange` when another page of the site changes the stored value under `key`, or clears
 * the storage. A page never hears of its own writes.
 */
export function subscribeToStorage(key: string, onChange: () => void): () => void {
  const listener = (event: StorageEvent): void => {
    // `key` is `null` when the other page cleared the storage.
    if (event.key === key || event.key === null) {
      onChange();
    }
  };
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener('storage', listener);
  };
}

/** The media query of the system theme, or `null` without `matchMedia`, as in jsdom. */
function darkSchemeQuery(): MediaQueryList | null {
  // Missing in DOM emulations used for tests, whatever the DOM types say.
  const matchMedia: Window['matchMedia'] | undefined = window.matchMedia;
  return matchMedia === undefined ? null : window.matchMedia(DARK_SCHEME_QUERY);
}

/**
 * The theme of the operating system: `dark` when it prefers a dark color scheme, `light`
 * otherwise, and the default theme of the stylesheet where the browser cannot tell.
 */
export function getSystemTheme(): Theme {
  const query = darkSchemeQuery();
  if (query === null) {
    return stylesheetTheme;
  }
  return query.matches ? 'dark' : 'light';
}

/** Call `onChange` when the color scheme of the operating system changes. */
export function subscribeToSystemTheme(onChange: () => void): () => void {
  const query = darkSchemeQuery();
  query?.addEventListener('change', onChange);
  return () => {
    query?.removeEventListener('change', onChange);
  };
}

/** A rule that turns every transition of the page off. */
const NO_TRANSITIONS = '*, *::before, *::after { transition: none !important; }';

/**
 * Turn every CSS transition off until the returned function runs. The rule is an adopted
 * stylesheet rather than a `<style>` element, so a Content Security Policy that blocks inline
 * styles allows it. Where the browser has no constructable stylesheets, nothing changes.
 */
function suppressTransitions(): () => void {
  let sheet: CSSStyleSheet;
  try {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(NO_TRANSITIONS);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  } catch {
    return () => {
      // Nothing to restore.
    };
  }
  return () => {
    // Computes the styles of the new theme while transitions are off, so none starts for them;
    // once the rule is gone, the computed values stay, and nothing is left to transition.
    getComputedStyle(document.documentElement).getPropertyValue('transition-property');
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
      (adopted) => adopted !== sheet,
    );
  };
}

/**
 * Set `attribute` of `<html>` to `theme`, with no CSS transition for the switch when
 * `withoutTransitions` is set. An attribute that already holds the theme, as the inline script
 * leaves it, stays untouched.
 */
export function applyTheme(
  attribute: `data-${string}`,
  theme: Theme,
  withoutTransitions: boolean,
): void {
  const root = document.documentElement;
  if (root.getAttribute(attribute) === theme) {
    return;
  }
  const restore = withoutTransitions ? suppressTransitions() : undefined;
  root.setAttribute(attribute, theme);
  restore?.();
}
