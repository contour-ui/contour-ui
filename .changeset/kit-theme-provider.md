---
'@contour-ui/react': minor
---

Add `ThemeProvider`, `useTheme` and `themeScript()`. The provider keeps the theme of the page on `<html>` as the `data-theme` attribute of the tokens: the user's choice, stored in `localStorage` under `contour-theme`, or `defaultTheme` (`system`) until they make one. `system` follows `prefers-color-scheme` as it changes, other tabs follow a new choice through the `storage` event, and a blocked storage falls back to the default without an error. A switch turns CSS transitions off for its moment unless `disableTransitionOnChange` is `false`. `useTheme()` returns `theme` (the choice), `resolvedTheme` (the theme in use) and `setTheme`; both values are `undefined` on the server and in the hydration render, so the hydration matches the server's HTML. `themeScript()` returns the source of an inline script for `<head>` that sets the same attribute before the first paint, so a page rendered on the server does not flash the default theme.
