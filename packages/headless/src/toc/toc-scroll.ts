import type { toc } from '@contour-ui/core';

import { computedPixels } from '../platform/scroll.ts';

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
    computedPixels(getComputedStyle(heading).scrollMarginTop) +
    computedPixels(getComputedStyle(container).scrollPaddingTop);
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
