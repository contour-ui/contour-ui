/** The scroll locks of each document: how many there are, and what undoes the first one. */
const locks = new Map<Document, { count: number; readonly unlock: () => void }>();

/**
 * Set inline properties on `element`; return what puts back the ones it had (value and
 * priority), and takes off the `style` attribute if it had none and nothing else set it since.
 */
function setStyles(element: HTMLElement, properties: Readonly<Record<string, string>>): () => void {
  const hadStyle = element.hasAttribute('style');
  const saved = Object.keys(properties).map((name) => ({
    name,
    value: element.style.getPropertyValue(name),
    priority: element.style.getPropertyPriority(name),
  }));
  for (const [name, value] of Object.entries(properties)) {
    element.style.setProperty(name, value);
  }
  return () => {
    for (const { name, value, priority } of saved) {
      if (value === '') {
        element.style.removeProperty(name);
      } else {
        element.style.setProperty(name, value, priority);
      }
    }
    if (!hadStyle && element.style.length === 0) {
      // Chromium writes CSSOM changes to the attribute lazily: read it first, or the removal
      // does not hold and an empty `style` comes back.
      element.getAttribute('style');
      element.removeAttribute('style');
    }
  };
}

/**
 * Lock the page: hide the overflow of the root element, which the viewport follows (a lock on
 * the body fails as soon as the root element sets an `overflow` of its own), and pad it by the
 * width of the scrollbar that disappears, so that the content does not move.
 */
function lock(doc: Document): () => void {
  const root = doc.documentElement;
  const style = getComputedStyle(root);
  // A gutter the page reserves itself stays when the scrollbar goes: nothing moves.
  const scrollbarWidth = style.scrollbarGutter.startsWith('stable')
    ? 0
    : Math.max(0, (doc.defaultView?.innerWidth ?? 0) - root.clientWidth);
  const properties: Record<string, string> = {
    'overflow-x': 'hidden',
    'overflow-y': 'hidden',
    '--scrollbar-width': `${scrollbarWidth}px`,
  };
  if (scrollbarWidth > 0) {
    properties['padding-inline-end'] = `calc(${style.paddingInlineEnd} + ${scrollbarWidth}px)`;
  }
  return setStyles(root, properties);
}

/**
 * Stop the page from scrolling while an overlay is open, as a modal dialog does; returns the
 * function that unlocks (the cleanup of a `preventScroll` effect). It locks at once: nothing
 * waits for the overlay to render.
 *
 * - The root element (`<html>`) gets `overflow: hidden`. The page keeps its scroll position.
 * - A scrollbar that took room comes back as padding: `padding-inline-end` of the root element
 *   grows by its width, on top of the page's own, so the content does not shift. Overlays
 *   (`position: fixed`, such as a backdrop) cover the whole viewport, the room of the scrollbar
 *   included. Overlay scrollbars take no room, nor does a gutter the page reserves itself
 *   (`scrollbar-gutter: stable`): nothing to make up then.
 * - While locked, `--scrollbar-width` on the root element holds that width (`0px` when nothing
 *   was made up). The padding does not hold the page's own fixed elements in place: they can
 *   do it themselves, with `inset-inline-end: var(--scrollbar-width, 0px)`.
 * - Locks are counted per document: nested overlays lock once, and the last unlock puts back
 *   the inline styles the root element had.
 * - Pages that scroll an element of their own, not the viewport, are not locked.
 *
 * @example
 * preventScroll: ({ prop }) => (prop('preventScroll') ? lockScroll() : undefined),
 */
export function lockScroll(doc: Document = document): () => void {
  let entry = locks.get(doc);
  if (entry === undefined) {
    entry = { count: 0, unlock: lock(doc) };
    locks.set(doc, entry);
  }
  const current = entry;
  current.count += 1;
  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    current.count -= 1;
    if (current.count === 0) {
      locks.delete(doc);
      current.unlock();
    }
  };
}
