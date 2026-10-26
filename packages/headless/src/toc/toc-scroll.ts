import type { toc } from '@contour-ui/core';

/** A length that `getComputedStyle` returns, in pixels; `auto` counts as 0. */
const pixels = (value: string): number => (value.endsWith('px') ? Number(value.slice(0, -2)) : 0);

/**
 * How to scroll: `behavior` when it is given; otherwise `smooth`, or `auto` when the user
 * prefers reduced motion.
 */
export function scrollBehaviorOf(behavior: toc.ScrollBehavior | undefined): ScrollBehavior {
  if (behavior !== undefined) {
    return behavior;
  }
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/** Whether `element` scrolls its content vertically: it lets it scroll, and the content is taller. */
function scrollsVertically(element: Element): boolean {
  const { overflowY } = getComputedStyle(element);
  return (
    (overflowY === 'auto' || overflowY === 'scroll') && element.scrollHeight > element.clientHeight
  );
}

/**
 * The nearest ancestor of `element` that scrolls vertically, other than the page: the search
 * stops at `<body>`, and at an ancestor that holds `boundary` (such as the scroll container of
 * the headings), so neither those nor anything above them is ever returned.
 */
export function scrollContainerOf(
  element: Element,
  boundary: Element | null = null,
): HTMLElement | null {
  const { body, documentElement } = element.ownerDocument;
  for (let node = element.parentElement; node !== null; node = node.parentElement) {
    if (
      node === body ||
      node === documentElement ||
      (boundary !== null && node.contains(boundary))
    ) {
      return null;
    }
    if (scrollsVertically(node)) {
      return node;
    }
  }
  return null;
}

/**
 * Scroll the nearest scroll container of `element` (see {@link scrollContainerOf}) the least
 * distance that shows the element whole, or its top when it is taller than the container.
 * Nothing scrolls when it is in view already, or has no such container. Unlike
 * `scrollIntoView`, which scrolls every ancestor, it never scrolls the page.
 *
 * @example
 * // Keep the active item of a long table of contents in view, inside the panel that scrolls it.
 * scrollIntoContainer(activeItem, { behavior: 'smooth' });
 */
export function scrollIntoContainer(
  element: Element,
  options: { readonly behavior: ScrollBehavior; readonly boundary?: Element | null | undefined },
): void {
  const container = scrollContainerOf(element, options.boundary);
  if (container === null) {
    return;
  }
  const box = container.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  // The visible part of the container: inside its borders, without a horizontal scroll bar.
  const top = box.top + container.clientTop;
  const bottom = top + container.clientHeight;
  let distance = 0;
  if (rect.top < top) {
    distance = rect.top - top;
  } else if (rect.bottom > bottom) {
    distance = Math.min(rect.bottom - bottom, rect.top - top);
  }
  if (distance !== 0) {
    container.scrollTo({ top: container.scrollTop + distance, behavior: options.behavior });
  }
}

/**
 * Scroll `heading` to the top of `container`, or of the page when there is no container (or the
 * heading is not in it), keeping its `scroll-margin-top` and the container's
 * `scroll-padding-top` free, as following a link to it does. With a container, only the
 * container scrolls.
 *
 * @example
 * scrollToHeading(document.getElementById('install'), article, 'smooth');
 */
export function scrollToHeading(
  heading: Element,
  container: HTMLElement | null,
  behavior: ScrollBehavior,
): void {
  if (container === null || !container.contains(heading)) {
    heading.scrollIntoView({ behavior, block: 'start' });
    return;
  }
  const offset =
    heading.getBoundingClientRect().top -
    container.getBoundingClientRect().top -
    container.clientTop;
  const free =
    pixels(getComputedStyle(heading).scrollMarginTop) +
    pixels(getComputedStyle(container).scrollPaddingTop);
  container.scrollTo({ top: container.scrollTop + offset - free, behavior });
}

/**
 * Move focus to the heading a link led to, without scrolling, as following the link would
 * have moved the reading position of screen readers and the start of the next Tab there. A
 * heading that does not take focus takes it until it loses it.
 */
export function focusHeading(heading: HTMLElement): void {
  if (!heading.hasAttribute('tabindex')) {
    heading.setAttribute('tabindex', '-1');
    heading.addEventListener(
      'blur',
      () => {
        heading.removeAttribute('tabindex');
      },
      { once: true },
    );
  }
  heading.focus({ preventScroll: true });
}
