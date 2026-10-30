import { toPageUrl } from '../layout/page-url.ts';

/** Where a result leads: its page and its heading. */
export interface Destination {
  /** The URL of its page, as the page tree has it (`/docs/essentials/button`). */
  readonly page: string;
  /** The `#hash` of its heading, as `location.hash` has it; `''` for the page itself. */
  readonly hash: string;
}

/** Where the result at `url` leads (`/docs/essentials/button#props`). */
export function destinationOf(url: string): Destination {
  const end = url.search(/[#?]/u);
  return {
    page: toPageUrl(end === -1 ? url : url.slice(0, end)),
    hash: new URL(url, window.location.href).hash,
  };
}

/**
 * Let `element` take the focus: one that takes it only with a `tabindex`, such as a heading, gets
 * `tabindex="-1"` until it loses the focus, as the styled Toc does with headings. Elements that
 * take focus already, such as buttons and links, are left as they are.
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

/** The heading a `#hash` names on the page: `null` without one, or for a malformed escape. */
function headingOf(hash: string): HTMLElement | null {
  let id = '';
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    // A malformed escape: the page itself.
  }
  return id === '' ? null : document.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
}

/**
 * Scroll to where a result leads on the page it is on, as a router does for a link to the
 * address the page is at already: to the heading of its `#hash`, or else to the top.
 */
export function scrollToDestination(hash: string): void {
  const heading = headingOf(hash);
  if (heading === null) {
    window.scrollTo(0, 0);
  } else {
    heading.scrollIntoView();
  }
}

/**
 * Move the focus to where a result leads, without scrolling (the framework has scrolled there),
 * as following a link moves the reading position of screen readers and the start of the next
 * Tab: the heading of its `#hash`, or else the main content of its page, the target of the skip
 * link.
 */
export function focusDestination(hash: string): void {
  const destination = headingOf(hash) ?? document.querySelector<HTMLElement>('#content');
  if (destination !== null) {
    focusableUntilBlur(destination).focus({ preventScroll: true });
  }
}

/**
 * The element to give the focus back to as the dialog closes: the one that had it as the dialog
 * opened, while it is still on the page, able to take it again. The styled Dialog gives it back
 * to that element itself, but only while it can take focus: a heading that the styled Toc or a
 * result focused could only until it lost the focus to the dialog. `null` for the page itself.
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
