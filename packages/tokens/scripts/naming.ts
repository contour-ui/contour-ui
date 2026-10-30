/**
 * CSS custom property naming, shared by the Style Dictionary build, the
 * generated `vars` and the design-system export:
 *
 * - `base.color.neutral.975`  -> `--ct-base-color-neutral-975`
 * - `color.accent.fill-hover` -> `--ct-color-accent-fill-hover`
 * - typography sub-value `text.label` + `letterSpacing` -> `--ct-text-label-letter-spacing`
 *
 * `base.*` tokens are emitted (semantic roles reference them) but stay internal:
 * components consume semantic roles only.
 */
export const CSS_PREFIX = 'ct';

const kebab = (segment: string): string =>
  segment.replaceAll(/[A-Z]/gu, (char) => `-${char.toLowerCase()}`);

export function cssVarName(path: readonly string[]): string {
  return `--${[CSS_PREFIX, ...path.map((segment) => kebab(segment))].join('-')}`;
}

export function cssVar(path: readonly string[]): string {
  return `var(${cssVarName(path)})`;
}
