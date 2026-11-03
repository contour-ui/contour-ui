/*
 * The focus of the DOM and its ring: the browser's `:focus-visible`, and the focus a press gives
 * from code, which shows no ring. Shared by the services of the web build: the drag focuses a
 * touch or a pen press itself, and the interaction service reads whether a focus came from it.
 */

/** Elements a press is focusing from code right now. */
const pressFocusing = new WeakSet<Element>();

/** Whether an element takes focus from code: HTML and SVG elements do, other elements do not. */
function canFocus(element: Element): element is Element & HTMLOrSVGElement {
  return 'focus' in element && typeof element.focus === 'function';
}

/**
 * Focus `element` for the press of a touch or a pen: the browser focuses a pressed element only
 * once such a press ends without moving, so a press that drags at once would never take the focus
 * (a mouse press takes it at once). The page does not scroll, and the focus shows no ring
 * ({@link isPressFocusing}), as after a click.
 */
export function focusFromPress(element: Element): void {
  if (!canFocus(element)) {
    return;
  }
  pressFocusing.add(element);
  try {
    element.focus({ preventScroll: true });
  } finally {
    pressFocusing.delete(element);
  }
}

/** Whether `element` is taking the focus of a press right now ({@link focusFromPress}). */
export function isPressFocusing(element: Element): boolean {
  return pressFocusing.has(element);
}

/**
 * Whether the browser shows the focus of `element`: `:focus-visible`. A browser that does not
 * know the selector shows every focus.
 */
export function showsFocusRing(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}
