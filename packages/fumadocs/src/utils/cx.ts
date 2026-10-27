/**
 * Join class names with spaces, skipping falsy values (`undefined`, `null`, `false`, `''`), e.g. a
 * component's own class and the user's optional `className`: `cx('contour-docs-prose', className)`.
 * Kit has its own; this one lets modules that render on the server import nothing from Kit.
 */
export function cx(...classNames: ReadonlyArray<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}
