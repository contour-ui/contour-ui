/**
 * Join class names with spaces, skipping falsy values (`undefined`, `null`,
 * `false`, `''`), e.g. a part's own class and the user's optional `className`:
 * `cx('contour-popover__content', className)`.
 */
export function cx(...classNames: ReadonlyArray<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}
