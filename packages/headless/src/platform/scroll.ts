import { containsComposed } from './dom.ts';

/** A length of computed style in pixels, such as `'8px'`; `0` for `auto` and other keywords. */
export function computedPixels(value: string): number {
  return value.endsWith('px') ? Number(value.slice(0, -2)) : 0;
}

/** Whether an `overflow` value lets the user scroll that axis. */
const scrollable = (overflow: string): boolean => overflow === 'auto' || overflow === 'scroll';

/** Whether `element` scrolls its content vertically: it lets it scroll, and the content is taller. */
function scrollsVertically(element: Element): boolean {
  return (
    scrollable(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight
  );
}

/**
 * The nearest ancestor of `element` that scrolls vertically, other than the page: the search
 * stops at `<body>`, and at an ancestor that holds `boundary` (such as the scroll container of
 * other content), so neither those nor anything above them is ever returned.
 *
 * @example
 * scrollContainerOf(activeItem); // the panel that scrolls a long table of contents, or `null`
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

/** What {@link scrollIntoContainer} scrolls, and how. */
export interface ScrollIntoContainerOptions {
  /**
   * The container to scroll, an ancestor of the element, such as the list of a listbox.
   *
   * @defaultValue the nearest ancestor that scrolls vertically, other than the page (see
   * {@link scrollContainerOf})
   */
  readonly container?: HTMLElement | null | undefined;
  /**
   * Without `container`, the search for one stops at an ancestor that holds this element: it
   * never scrolls, nor does anything above it.
   */
  readonly boundary?: Element | null | undefined;
  /**
   * How to scroll: `smooth`, `instant`, or `auto`, which follows the `scroll-behavior` of the
   * container.
   *
   * @defaultValue 'auto'
   */
  readonly behavior?: ScrollBehavior | undefined;
}

/**
 * How far to scroll so that the span from `start` to `end` shows between `min` and `max`:
 * nothing when it does already, and its start first when it is longer than the room.
 */
function distance(start: number, end: number, min: number, max: number): number {
  if (start < min) {
    return start - min;
  }
  if (end > max) {
    return Math.min(end - max, start - min);
  }
  return 0;
}

/**
 * How much larger an element is drawn than laid out along one axis, from its size on screen and
 * its layout size: below 1 under a `scale` or `transform` that shrinks it or an ancestor, as an
 * overlay that grows in as it opens. `1` within a pixel of the layout size, which is rounded.
 */
function drawnScale(drawn: number, laidOut: number): number {
  return laidOut > 0 && Math.abs(drawn - laidOut) >= 1 ? drawn / laidOut : 1;
}

/**
 * Scroll a container of `element` by as little as it takes to show the element whole, or its
 * start when it is larger than the container, within the `scroll-padding` of the container.
 * Nothing scrolls when the element is in view already, or when there is no container. Only the
 * axes the container lets the user scroll (`overflow` `auto` or `scroll`) move. Unlike
 * `element.scrollIntoView()`, which scrolls every ancestor, it never scrolls the page.
 *
 * Distances are taken in the container's layout pixels, so a container drawn scaled, as an
 * overlay that is still growing in, scrolls as far as it will when the animation ends.
 *
 * @example
 * // The highlighted option of a listbox, in its list.
 * scrollIntoContainer(option, { container: list });
 * // The active item of a long table of contents, in whatever panel scrolls it.
 * scrollIntoContainer(activeItem, { behavior: 'smooth' });
 */
export function scrollIntoContainer(
  element: Element,
  { container, boundary, behavior = 'auto' }: ScrollIntoContainerOptions = {},
): void {
  const scroller = container ?? scrollContainerOf(element, boundary);
  if (scroller === null) {
    return;
  }
  const style = getComputedStyle(scroller);
  const box = scroller.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  const scaleY = drawnScale(box.height, scroller.offsetHeight);
  const scaleX = drawnScale(box.width, scroller.offsetWidth);
  // The edges of the element from the start of the room inside the borders, in layout pixels.
  const top = (rect.top - box.top) / scaleY - scroller.clientTop;
  const bottom = (rect.bottom - box.top) / scaleY - scroller.clientTop;
  const left = (rect.left - box.left) / scaleX - scroller.clientLeft;
  const right = (rect.right - box.left) / scaleX - scroller.clientLeft;
  // The room: without the scroll bars, less the scroll padding.
  const down = scrollable(style.overflowY)
    ? distance(
        top,
        bottom,
        computedPixels(style.scrollPaddingTop),
        scroller.clientHeight - computedPixels(style.scrollPaddingBottom),
      )
    : 0;
  const across = scrollable(style.overflowX)
    ? distance(
        left,
        right,
        computedPixels(style.scrollPaddingLeft),
        scroller.clientWidth - computedPixels(style.scrollPaddingRight),
      )
    : 0;
  if (down === 0 && across === 0) {
    return;
  }
  // Only the axes that move, so the other one keeps any scroll still running on it.
  const options: ScrollToOptions = { behavior };
  if (down !== 0) {
    options.top = scroller.scrollTop + down;
  }
  if (across !== 0) {
    options.left = scroller.scrollLeft + across;
  }
  scroller.scrollTo(options);
}

/**
 * Scroll `element` into view (see {@link scrollIntoContainer}) in the scroll container nearest to
 * it, when `content` holds that container: never the page, nor anything around the content, such
 * as the parents of an overlay rendered in place. For the element focus moved to, without
 * scrolling, as an overlay opened, once the overlay has its size.
 *
 * @example
 * revealIn(dialogContent, document.activeElement); // the field below the fold of a dialog body
 */
export function revealIn(content: Element, element: Element): void {
  const container = scrollContainerOf(element);
  if (container !== null && containsComposed(content, container)) {
    scrollIntoContainer(element, { container });
  }
}
