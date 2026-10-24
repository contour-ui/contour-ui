/**
 * contour-ui design tokens.
 *
 * CSS: import `@contour-ui/tokens/tokens.css` once; it declares every token as a
 * `--ct-*` custom property, dark theme by default, light under `[data-theme="light"]`.
 * TS: `vars` holds `var(--ct-…)` references to the semantic tokens.
 */
export { defaultTheme, themeAttribute, themes, vars } from './generated/vars.ts';
export type { Theme } from './generated/vars.ts';
