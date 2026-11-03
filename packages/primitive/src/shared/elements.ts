/**
 * The elements every backend renders: the vocabulary shared parts are written in, web words
 * rendered by each platform, by kind:
 *
 * - **boxes**: `div` and `span`, a `<div>` and a `<span>` on the web, a `View` on native
 *   platforms (a `span` often holds an icon, so it is a box, not text);
 * - **a text leaf**: `text`, a `<span>` on the web, a `Text` on native platforms, which holds
 *   strings, numbers and other `text` elements only;
 * - **a pressable**: `button`, a `<button>` on the web, a `Pressable` on native platforms; it
 *   takes `onPress` (a click, Enter or Space, or the "activate" of assistive technology) in
 *   place of `onClick`;
 * - **vector shapes**: `svg`, `path` and `line`. On native platforms only the `svg` is a node,
 *   with input, focus and accessibility; its shapes take presentation props (`d`, `stroke`,
 *   `color`…), no ref and no events;
 * - **a form value**: `formValue`, an `<input type="hidden">` on the web, nothing on native
 *   platforms, which have no forms.
 *
 * The host of an element depends on the element alone, never on its props: an element that
 * changed host with its props would remount its subtree.
 */
export type SharedElement =
  | 'div'
  | 'span'
  | 'text'
  | 'button'
  | 'svg'
  | 'path'
  | 'line'
  | 'formValue';

/** The shared elements, as a list: the keys of `Primitive` in every build. */
export const SHARED_ELEMENTS: readonly SharedElement[] = [
  'div',
  'span',
  'text',
  'button',
  'svg',
  'path',
  'line',
  'formValue',
];

/**
 * Elements of the web build only: the DOM elements of the parts that run on the web alone so
 * far. Shared code cannot use them: the Soundor build has no such keys, and its type check fails.
 */
export type WebOnlyElement =
  | 'a'
  | 'caption'
  | 'figcaption'
  | 'figure'
  | 'h2'
  | 'h3'
  | 'input'
  | 'kbd'
  | 'label'
  | 'li'
  | 'nav'
  | 'p'
  | 'table'
  | 'tbody'
  | 'td'
  | 'tfoot'
  | 'th'
  | 'thead'
  | 'tr'
  | 'ul';

/** The shapes of the vector vocabulary: children of an `svg`, with no node of their own on native. */
export type ShapeElement = 'path' | 'line';
