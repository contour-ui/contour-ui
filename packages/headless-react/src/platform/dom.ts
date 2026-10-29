/**
 * The focused element of a document, looked up inside shadow roots too; `null` while nothing
 * but the body has focus.
 *
 * @example
 * const before = getActiveElement(document); // the trigger, as a dialog opens
 */
export function getActiveElement(doc: Document): Element | null {
  let active = doc.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active === doc.body ? null : active;
}

/**
 * The parent of a node across shadow boundaries: the host of a shadow root, the parent node
 * otherwise.
 */
export function composedParent(node: Node): Node | null {
  return node instanceof ShadowRoot ? node.host : node.parentNode;
}

/**
 * Whether `node` is `container` or inside it, inside its shadow roots too, where
 * `Node.contains` stops.
 *
 * @example
 * if (!containsComposed(content, getActiveElement(document))) {
 *   // focus left the content
 * }
 */
export function containsComposed(container: Node, node: Node | null): boolean {
  for (let current = node; current !== null; current = composedParent(current)) {
    if (current === container) {
      return true;
    }
  }
  return false;
}

/** Whether an event target is an element: the nodes of an event path, window and document aside. */
function isElement(target: EventTarget | null | undefined): target is Element {
  return target instanceof Element;
}

/**
 * The element an event happened on, inside shadow roots too: the start of its path. Read it while
 * the event is dispatched; the path is empty afterwards.
 */
export function eventTarget(event: Event): Element | null {
  const [first] = event.composedPath();
  if (isElement(first)) {
    return first;
  }
  return isElement(event.target) ? event.target : null;
}

/**
 * Whether a value is neither `null` nor `undefined`: a filter for lists of elements that may not
 * be rendered.
 *
 * @example
 * const kept = [content, trigger].filter((element) => isPresent(element));
 */
export function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
