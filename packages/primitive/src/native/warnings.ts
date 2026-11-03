/**
 * The diagnostics of the native backends. A native runtime has no `process.env.NODE_ENV` to tell
 * development from production, so a warning is given in both, once per element and prop: the
 * first time costs a `console.warn`, every other time a lookup in a set.
 */

/** The warnings already given, as `<element> <prop>`. */
const given = new Set<string>();

/**
 * Warn once that `Primitive.<element>` dropped or changed `prop`, with `message` saying why.
 *
 * @example
 * warnOnce('div', 'className', 'web-only: native elements are styled through `style`.');
 * // console.warn('Primitive.div: `className` is web-only: …') the first time, nothing after.
 */
export function warnOnce(element: string, prop: string, message: string): void {
  const key = `${element} ${prop}`;
  if (given.has(key)) {
    return;
  }
  given.add(key);
  console.warn(`Primitive.${element}: \`${prop}\` ${message}`);
}

/** Forget the warnings given, so a test sees each again. */
export function resetWarnings(): void {
  given.clear();
}
