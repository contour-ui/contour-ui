/**
 * Let `element` take the focus: one that takes it only with a `tabindex`, such as a heading, gets
 * `tabindex="-1"` until it loses the focus, as Kit's Toc does with headings. Elements that take
 * focus already, such as buttons and links, are left as they are.
 */
function focusableUntilBlur(element: HTMLElement): HTMLElement {
  if (element.tabIndex < 0 && !element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '-1');
    element.addEventListener(
      'blur',
      () => {
        element.removeAttribute('tabindex');
      },
      { once: true },
    );
  }
  return element;
}

/**
 * Where a result leads: the heading of its `#hash`, or else the main content of its page, the
 * target of the skip link.
 */
export function destinationOf(hash: string): HTMLElement | null {
  let id = '';
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    // A malformed escape: the page itself.
  }
  const heading = id === '' ? null : document.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  return heading ?? document.querySelector<HTMLElement>('#content');
}

/**
 * Move the focus to where a result leads, without scrolling (the router has scrolled there), as
 * following a link moves the reading position of screen readers and the start of the next Tab.
 */
export function focusDestination(element: HTMLElement): void {
  focusableUntilBlur(element).focus({ preventScroll: true });
}

/**
 * The element to give the focus back to as the dialog closes: the one that had it as the dialog
 * opened, while it is still on the page, able to take it again. Kit's Dialog gives it back to
 * that element itself, but only while it can take focus: a heading that Kit's Toc or a result
 * focused could only until it lost the focus to the dialog. `null` for the page itself.
 */
export function focusTargetBack(focusedBefore: Element | null): HTMLElement | null {
  if (
    !(focusedBefore instanceof HTMLElement) ||
    !focusedBefore.isConnected ||
    focusedBefore === focusedBefore.ownerDocument.body
  ) {
    return null;
  }
  return focusableUntilBlur(focusedBefore);
}
