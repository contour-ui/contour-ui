/** An element that can take focus: an HTML or an SVG element. */
export type FocusableElement = HTMLElement | SVGElement;

/**
 * Elements that may take focus: by themselves, or through `tabindex`. Whether one does (not
 * disabled, not inert, rendered) is checked on each of them.
 */
const CANDIDATES = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'details > summary:first-of-type',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(', ');

/**
 * Whether an element is rendered so that it can take focus: not inside `display: none`, closed
 * `<details>` or `content-visibility: hidden`, and not `visibility: hidden` itself. Opacity does
 * not count: content that fades in takes focus from its first frame.
 */
function isRendered(element: Element): boolean {
  // Safari has `checkVisibility` from 17.4.
  if ('checkVisibility' in element) {
    return element.checkVisibility({ checkVisibilityCSS: true });
  }
  return (
    (element as Element).getClientRects().length > 0 &&
    getComputedStyle(element).visibility === 'visible'
  );
}

/**
 * Whether an element can take focus: by itself (a link, a button, a form control, an editable
 * region…) or through a `tabindex` of any value, and only while it is not disabled, not inside
 * an `inert` subtree and rendered (see `isRendered`). Elements inside shadow roots and iframes
 * are not looked into.
 *
 * @example
 * isFocusable(document.querySelector('[tabindex="-1"]')); // true, but not tabbable
 */
export function isFocusable(element: Element): element is FocusableElement {
  return (
    (element instanceof HTMLElement || element instanceof SVGElement) &&
    element.matches(CANDIDATES) &&
    !element.matches(':disabled') &&
    element.closest('[inert]') === null &&
    isRendered(element)
  );
}

/**
 * The position of an element in the tab order, as the browser uses it: `tabIndex`, except for
 * the elements Tab reaches without a `tabindex` although their `tabIndex` reads `-1` (editable
 * regions, media with controls).
 */
function tabIndexOf(element: FocusableElement): number {
  if (!element.hasAttribute('tabindex') && element.matches('[contenteditable], audio, video')) {
    return 0;
  }
  return element.tabIndex;
}

/**
 * Whether a focusable radio button is the stop of its group in the tab order: the checked one,
 * or the first one while none is. Other radios are reached with the arrow keys.
 */
function isRadioTabStop(element: FocusableElement): boolean {
  if (!(element instanceof HTMLInputElement) || element.type !== 'radio' || element.name === '') {
    return true;
  }
  const root = element.form ?? element.getRootNode();
  if (
    !(root instanceof HTMLFormElement || root instanceof Document || root instanceof ShadowRoot)
  ) {
    return true;
  }
  const group = [
    ...root.querySelectorAll<HTMLInputElement>(
      `input[type="radio"][name="${CSS.escape(element.name)}"]`,
    ),
  ].filter((radio) => radio.form === element.form && isFocusable(radio));
  const stop = group.find((radio) => radio.checked) ?? group[0];
  return stop === element;
}

/**
 * Whether Tab reaches an element: it is focusable (see {@link isFocusable}), its `tabindex` is
 * not negative, and a radio button is the stop of its group (checked, or the first while none
 * is).
 *
 * @example
 * isTabbable(button); // true
 * isTabbable(contentWithTabIndexMinusOne); // false
 */
export function isTabbable(element: Element): element is FocusableElement {
  return isFocusable(element) && tabIndexOf(element) >= 0 && isRadioTabStop(element);
}

/**
 * The elements inside `root` that Tab reaches (see {@link isTabbable}), in document order.
 * `root` itself is not one of them. A positive `tabindex` does not move an element forward:
 * keep to `0` and `-1`.
 *
 * @example
 * // Tab from the last element of a portalled popover: on to what follows its trigger.
 * const tabbables = getTabbables(document.body);
 * const next = tabbables
 *   .slice(tabbables.indexOf(trigger) + 1)
 *   .find((element) => !content.contains(element));
 * next?.focus();
 */
export function getTabbables(root: Element): FocusableElement[] {
  return [...root.querySelectorAll(CANDIDATES)].filter((element) => isTabbable(element));
}

/**
 * The first element inside `root` that Tab reaches, or `null`.
 *
 * @example
 * (getFirstTabbable(content) ?? content).focus();
 */
export function getFirstTabbable(root: Element): FocusableElement | null {
  for (const element of root.querySelectorAll(CANDIDATES)) {
    if (isTabbable(element)) {
      return element;
    }
  }
  return null;
}

/**
 * The last element inside `root` that Tab reaches, or `null`.
 *
 * @example
 * // Shift+Tab on the first element of a focus trap goes round to the last one.
 * getLastTabbable(content)?.focus();
 */
export function getLastTabbable(root: Element): FocusableElement | null {
  return getTabbables(root).at(-1) ?? null;
}
