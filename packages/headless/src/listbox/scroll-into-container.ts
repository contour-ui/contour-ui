/** A computed length in pixels, such as `'8px'`; `0` for `auto`, the default scroll padding. */
const pixels = (value: string): number => (value.endsWith('px') ? Number(value.slice(0, -2)) : 0);

/**
 * How far to scroll so that the span from `start` to `end` shows between `min` and `max`:
 * nothing when it already does, and its start first when it is longer than the room.
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
 * Scroll `container` by as little as it takes to show all of `element`, one of its
 * descendants, on both axes, within the `scroll-padding` of the container. Unlike
 * `element.scrollIntoView()`, no other scroll container moves, the page included.
 *
 * @example
 * scrollIntoContainer(listElement, highlightedItemElement);
 */
export function scrollIntoContainer(container: HTMLElement, element: HTMLElement): void {
  const style = getComputedStyle(container);
  const box = container.getBoundingClientRect();
  const target = element.getBoundingClientRect();
  // The room inside the borders, without the scroll bars, less the scroll padding.
  const top = box.top + container.clientTop;
  const left = box.left + container.clientLeft;
  container.scrollTop += distance(
    target.top,
    target.bottom,
    top + pixels(style.scrollPaddingTop),
    top + container.clientHeight - pixels(style.scrollPaddingBottom),
  );
  container.scrollLeft += distance(
    target.left,
    target.right,
    left + pixels(style.scrollPaddingLeft),
    left + container.clientWidth - pixels(style.scrollPaddingRight),
  );
}
