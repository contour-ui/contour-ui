import { isPresent } from './dom.ts';
import { getLayersAbove, reserveOrder, subscribeToLayers } from './layer-stack.ts';
import { whenRendered } from './when-rendered.ts';
import type { ElementSource } from './when-rendered.ts';

/** Options of {@link hideOutside}. */
export interface HideOutsideOptions {
  /**
   * Elements that stay reachable besides the element, such as the trigger of a modal popover.
   * Read on start and on every change of the layer stack.
   */
  readonly exclude?: (() => ReadonlyArray<Element | null | undefined>) | undefined;
}

/** A running `hideOutside`. */
interface Lock {
  /** Its place in the opening order, shared with layers: the layers opened later stay reachable. */
  readonly order: number;
  readonly element: Element;
  readonly exclude: HideOutsideOptions['exclude'];
  /** The elements this lock holds inert. */
  readonly held: Set<HTMLElement>;
}

/** Elements that render nothing: making them inert changes nothing. */
const RENDERLESS = new Set(['script', 'style', 'template', 'link', 'meta', 'noscript']);

/** Roles of live regions, whose changes screen readers announce. */
const LIVE_ROLES = new Set(['status', 'alert', 'log', 'marquee', 'timer']);

/**
 * How many locks hold each element they made inert. Elements inert for a reason of their own
 * are not here.
 */
const holders = new Map<HTMLElement, number>();
const locks = new Set<Lock>();
let unsubscribe: (() => void) | null = null;

/** Whether an element is a live region: what it announces, such as a toast, is still heard. */
function isLiveRegion(element: HTMLElement): boolean {
  const live = element.getAttribute('aria-live');
  const roles = element.getAttribute('role')?.split(/\s+/u) ?? [];
  return (
    (live !== null && live !== 'off') ||
    element.localName === 'output' ||
    roles.some((role) => LIVE_ROLES.has(role))
  );
}

/** The element itself, or the host in the document of the shadow root it is in. */
function lightHost(element: Element): Element {
  let current = element;
  for (let root = current.getRootNode(); root instanceof ShadowRoot; root = current.getRootNode()) {
    current = root.host;
  }
  return current;
}

/**
 * The elements to make inert so that only `kept` stays reachable: from each kept element up to
 * the body, the siblings at every level. Elements that render nothing and live regions are left
 * out. Nothing at all when no kept element is in the body, or one holds the body itself.
 */
function collectOutside(kept: readonly Element[]): Set<HTMLElement> {
  const outside = new Set<HTMLElement>();
  const [first] = kept;
  if (first === undefined) {
    return outside;
  }
  const { body } = first.ownerDocument;
  const hosts = kept.map((element) => lightHost(element));
  if (hosts.some((element) => element.contains(body))) {
    return outside;
  }
  const keptSet = new Set(hosts.filter((element) => body.contains(element)));
  const ancestors = new Set<Element>();
  for (const element of keptSet) {
    for (
      let node = element.parentElement;
      node !== null && node !== body;
      node = node.parentElement
    ) {
      ancestors.add(node);
    }
  }
  const visit = (parent: Element): void => {
    for (const child of parent.children) {
      if (keptSet.has(child)) {
        continue;
      }
      if (ancestors.has(child)) {
        visit(child);
      } else if (
        child instanceof HTMLElement &&
        !RENDERLESS.has(child.localName) &&
        !isLiveRegion(child)
      ) {
        outside.add(child);
      }
    }
  };
  if (keptSet.size > 0) {
    visit(body);
  }
  return outside;
}

/**
 * Make an element inert for one more lock. One that is inert already, for a reason of its own,
 * is left alone: `false`.
 */
function hold(element: HTMLElement): boolean {
  const count = holders.get(element);
  if (count !== undefined) {
    holders.set(element, count + 1);
    return true;
  }
  if (element.inert) {
    return false;
  }
  element.inert = true;
  holders.set(element, 1);
  return true;
}

/** Release an element for one lock: the last one takes `inert` off. */
function release(element: HTMLElement): void {
  const count = holders.get(element) ?? 0;
  if (count > 1) {
    holders.set(element, count - 1);
    return;
  }
  holders.delete(element);
  element.inert = false;
}

/** Bring a lock up to date with the DOM and the layers opened above it. */
function update(lock: Lock): void {
  const kept = [lock.element, ...(lock.exclude?.() ?? []), ...getLayersAbove(lock.order)].filter(
    (element) => isPresent(element),
  );
  const outside = collectOutside(kept);
  for (const element of lock.held) {
    if (!outside.has(element)) {
      lock.held.delete(element);
      release(element);
    }
  }
  for (const element of outside) {
    if (!lock.held.has(element) && hold(element)) {
      lock.held.add(element);
    }
  }
}

function updateAll(): void {
  for (const lock of locks) {
    update(lock);
  }
}

/**
 * Make everything outside `element` inert while a modal layer is open: out of reach of the
 * pointer, the keyboard and assistive technologies. Returns the function that ends it (the
 * cleanup of a `hideOutside` effect). It starts once the element is rendered (see
 * `whenRendered`).
 *
 * - From the element (and each `exclude` element) up to the body, the siblings at every level
 *   get `inert`; the element, what is inside it and its ancestors stay as they are.
 * - Live regions (`aria-live`, `role="status"`, `alert`, `log`…), such as a region of toasts,
 *   keep announcing; `script`, `style`, `template` are skipped.
 * - An element inert already, for a reason of its own, is left alone and stays inert after.
 * - Nested modal layers count: an element stays inert until the last lock that holds it ends.
 * - Layers opened above (see `trackLayer`) stay reachable, even portalled to the body: a
 *   popover opened from a dialog. A layer that was rendered before the dialog opened, closed
 *   and hidden, gets its `inert` back off when it opens above it.
 * - Elements added to the page afterwards are not made inert until the layer stack changes.
 *
 * @example
 * hideOutside: ({ prop }) =>
 *   prop('modal')
 *     ? hideOutside(() => dom.getContent(), { exclude: () => [dom.getTrigger()] })
 *     : undefined,
 */
export function hideOutside(
  element: ElementSource<Element>,
  options: HideOutsideOptions = {},
): () => void {
  const order = reserveOrder();
  return whenRendered(element, 'inert', (rendered) => {
    const lock: Lock = { order, element: rendered, exclude: options.exclude, held: new Set() };
    locks.add(lock);
    unsubscribe ??= subscribeToLayers(updateAll);
    update(lock);
    return () => {
      for (const held of lock.held) {
        release(held);
      }
      lock.held.clear();
      locks.delete(lock);
      if (locks.size === 0) {
        unsubscribe?.();
        unsubscribe = null;
      }
    };
  });
}
