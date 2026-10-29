import {
  composedParent,
  containsComposed,
  eventTarget,
  getActiveElement,
  isPresent,
} from './dom.ts';
import { isFocusable } from './tabbable.ts';
import { whenRendered } from './when-rendered.ts';
import type { ElementSource } from './when-rendered.ts';

/** What a layer reports about a press outside it, besides the event. */
export interface PointerDownOutsideDetails {
  /** The element pressed, inside shadow roots too. */
  readonly target: Element;
  /**
   * Whether the press moves focus: the target or one of its ancestors takes focus. Focus that
   * such a press moves outside should stay there, so a popover it closes does not send focus
   * back to its trigger.
   */
  readonly focusable: boolean;
}

/**
 * Options of {@link trackLayer}. The layer closes nothing itself: it reports, the caller
 * decides.
 */
export interface LayerOptions {
  /**
   * Elements that count as part of the layer, so that pressing them or moving focus to them is
   * not an interaction outside it: the trigger, whose own click toggles the layer (were it
   * outside, a press on it would close the layer and its click open it again), an anchor. Read
   * on every event.
   */
  readonly exclude?: (() => ReadonlyArray<Element | null | undefined>) | undefined;
  /**
   * Elements that get `--layer-index` besides the layer element, read on every change of the
   * stack: the positioner, the backdrop, whose `z-index` the kits compute from it.
   */
  readonly styleTargets?: (() => ReadonlyArray<HTMLElement | null | undefined>) | undefined;
  /**
   * Escape was pressed while this layer is the top-most one. Not called for a key an element
   * used before (`event.defaultPrevented`), nor during IME composition. Call
   * `event.preventDefault()` to tell listeners further up, on `window`, that the key is used.
   */
  readonly onEscapeKeyDown?: ((event: KeyboardEvent) => void) | undefined;
  /**
   * A pointer was pressed outside this layer, its `exclude` elements and the layers above it,
   * while this layer is the top-most one: a press dismisses one layer at a time. A touch is
   * reported on the `click` that follows it, so a touch that starts a scroll reports nothing.
   */
  readonly onPointerDownOutside?:
    | ((event: PointerEvent, details: PointerDownOutsideDetails) => void)
    | undefined;
  /**
   * Focus moved to an element outside this layer, its `exclude` elements and the layers above
   * it: Tab, or a script. Called for every layer focus left, top-most first, once the focus
   * change is over: not when something (a focus trap) brings focus back at once, nor for focus
   * that a press moved, which `onPointerDownOutside` reports.
   */
  readonly onFocusOutside?: ((event: FocusEvent) => void) | undefined;
  /**
   * A layer this one is nested in closed (or stopped): a layer opened before it whose element
   * holds this layer's element or one of its `exclude` elements (its trigger), directly or
   * through layers nested in it, as a popover opened from a dialog. Map it to a plain close
   * request, whatever `closeOnInteractOutside` says. Called top-most first, synchronously in the
   * cleanup of that layer; layers opened later from elsewhere are not nested and stay.
   */
  readonly onParentClose?: (() => void) | undefined;
}

/** A tracked layer. */
interface Layer {
  /** Its place in the opening order, shared with focus traps and `hideOutside`. */
  readonly order: number;
  readonly options: LayerOptions;
  /** Its element once rendered; `null` while the layer waits for it, and once it is closed. */
  element: HTMLElement | null;
  /** The elements that got `--layer-index`, to clear when the layer closes. */
  readonly styled: Set<HTMLElement>;
}

/** A touch outside the top-most layer, reported on the `click` that follows it. */
interface PendingTouch {
  readonly layer: Layer;
  readonly event: PointerEvent;
  readonly details: PointerDownOutsideDetails;
}

/** Every open layer, in opening order: the top-most one is the last. */
const layers: Layer[] = [];
/**
 * The place in the opening order of every element that has been the element of a layer, the
 * latest one for an element that came back. A closed layer keeps it: its element may stay in the
 * DOM a while, as it animates out, and hold focus.
 */
const layerOrders = new WeakMap<Element, number>();
const subscribers = new Set<() => void>();
/** The documents with layers, and how many layers each has. */
const listening = new Map<Document, { count: number; readonly remove: () => void }>();
let lastOrder = 0;
/**
 * The element of the press in progress, until its `click` or a key: focus that it moves (on
 * `mousedown`, before the `click`, for a touch too) is its own.
 */
let pressTarget: Element | null = null;
let pendingTouch: PendingTouch | null = null;

/**
 * Take the next place in the opening order of overlays. Layers, focus traps and `hideOutside`
 * share it: what takes its place later is above.
 */
export function reserveOrder(): number {
  lastOrder += 1;
  return lastOrder;
}

/**
 * The elements of the rendered layers opened after `order`: those above a focus trap or a
 * modal layer, such as a popover opened from a dialog and portalled out of it.
 */
export function getLayersAbove(order: number): HTMLElement[] {
  return layers.flatMap((layer) =>
    layer.order > order && layer.element !== null ? [layer.element] : [],
  );
}

/** Whether `node` is inside a rendered layer opened after `order` (see {@link getLayersAbove}). */
export function isInLayerAbove(order: number, node: Node | null): boolean {
  return getLayersAbove(order).some((element) => containsComposed(element, node));
}

/**
 * The place in the opening order of the layer whose element is `element`, open or closed;
 * `undefined` for an element that has never been one.
 */
export function getLayerOrder(element: Element): number | undefined {
  return layerOrders.get(element);
}

/**
 * Whether `node` is inside the element of a layer opened after `order` that has closed since,
 * such as a popover portalled out of a dialog that closed with the dialog and is still in the
 * DOM while it animates out. A layer above that is still open does not count.
 */
export function isInClosedLayerAbove(order: number, node: Node | null): boolean {
  const open = new Set<Element | null>(layers.map((layer) => layer.element));
  for (let current = node; current !== null; current = composedParent(current)) {
    if (current instanceof Element && !open.has(current)) {
      const closed = layerOrders.get(current);
      if (closed !== undefined && closed > order) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Call `listener` after every change of the stack: a layer rendered or closed. Returns the
 * function that unsubscribes it.
 */
export function subscribeToLayers(listener: () => void): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

/** Whether `node` is inside `layer`, one of its `exclude` elements, or a layer above it. */
function isInside(layer: Layer, node: Node): boolean {
  if (layer.element !== null && containsComposed(layer.element, node)) {
    return true;
  }
  const excluded = (layer.options.exclude?.() ?? []).filter((element) => isPresent(element));
  if (excluded.some((element) => containsComposed(element, node))) {
    return true;
  }
  return isInLayerAbove(layer.order, node);
}

/** The top-most layer, if it is rendered: a layer still waiting for its element reports nothing. */
function renderedTop(): Layer | undefined {
  const top = layers.at(-1);
  return top?.element === null ? undefined : top;
}

/** Whether a press on `target` moves focus: it, or one of its ancestors, takes focus. */
function pressMovesFocus(target: Element): boolean {
  for (let node: Element | null = target; node !== null; node = node.parentElement) {
    if (isFocusable(node)) {
      return true;
    }
  }
  return false;
}

function onKeyDownCapture(): void {
  pressTarget = null;
}

/** Escape, after the handlers of the page (React's included), which may use it first. */
function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || event.isComposing || event.defaultPrevented) {
    return;
  }
  renderedTop()?.options.onEscapeKeyDown?.(event);
}

function onPointerDown(event: PointerEvent): void {
  const target = eventTarget(event);
  pressTarget = target;
  pendingTouch = null;
  const top = renderedTop();
  if (target === null || top === undefined || isInside(top, target)) {
    return;
  }
  const details: PointerDownOutsideDetails = { target, focusable: pressMovesFocus(target) };
  if (event.pointerType === 'touch') {
    pendingTouch = { layer: top, event, details };
    return;
  }
  top.options.onPointerDownOutside?.(event, details);
}

/** A touch that turned into a scroll or a gesture: no click follows it. */
function onPointerCancel(): void {
  pendingTouch = null;
}

function onClick(): void {
  pressTarget = null;
  const touch = pendingTouch;
  pendingTouch = null;
  if (touch !== null && renderedTop() === touch.layer) {
    touch.layer.options.onPointerDownOutside?.(touch.event, touch.details);
  }
}

function onFocusIn(event: FocusEvent): void {
  const target = eventTarget(event);
  // Focus that a press moved: the press reported itself, to the top-most layer only.
  if (target === null || (pressTarget !== null && containsComposed(target, pressTarget))) {
    return;
  }
  const doc = target.ownerDocument;
  // Once the handlers of this focus change have run: a focus trap may have brought focus back.
  queueMicrotask(() => {
    if (getActiveElement(doc) !== target) {
      return;
    }
    for (const layer of layers.toReversed()) {
      // A layer that an earlier report closed is gone from the stack.
      if (layer.element !== null && layers.includes(layer) && !isInside(layer, target)) {
        layer.options.onFocusOutside?.(event);
      }
    }
  });
}

/** Listen to `doc` while it has layers; returns the function that stops, for one layer. */
function listenTo(doc: Document): () => void {
  let entry = listening.get(doc);
  if (entry === undefined) {
    doc.addEventListener('keydown', onKeyDownCapture, true);
    doc.addEventListener('keydown', onKeyDown);
    doc.addEventListener('pointerdown', onPointerDown, true);
    doc.addEventListener('pointercancel', onPointerCancel, true);
    doc.addEventListener('click', onClick, true);
    doc.addEventListener('focusin', onFocusIn, true);
    entry = {
      count: 0,
      remove: () => {
        doc.removeEventListener('keydown', onKeyDownCapture, true);
        doc.removeEventListener('keydown', onKeyDown);
        doc.removeEventListener('pointerdown', onPointerDown, true);
        doc.removeEventListener('pointercancel', onPointerCancel, true);
        doc.removeEventListener('click', onClick, true);
        doc.removeEventListener('focusin', onFocusIn, true);
      },
    };
    listening.set(doc, entry);
  }
  const current = entry;
  current.count += 1;
  return () => {
    current.count -= 1;
    if (current.count === 0) {
      current.remove();
      listening.delete(doc);
    }
  };
}

/** Write `--layer-index` (the place in the stack, from 0) on every rendered layer. */
function applyLayerIndex(): void {
  for (const [index, layer] of layers.entries()) {
    if (layer.element === null) {
      continue;
    }
    const targets = [layer.element, ...(layer.options.styleTargets?.() ?? [])].filter((element) =>
      isPresent(element),
    );
    for (const target of targets) {
      target.style.setProperty('--layer-index', String(index));
      layer.styled.add(target);
    }
  }
}

/** Clear what the layer wrote. */
function clearLayerIndex(layer: Layer): void {
  for (const target of layer.styled) {
    target.style.removeProperty('--layer-index');
  }
  layer.styled.clear();
}

/** After a change of the stack: update the indexes, then tell the subscribers. */
function changed(): void {
  applyLayerIndex();
  for (const subscriber of subscribers) {
    subscriber();
  }
}

/**
 * The layers nested in `parent`, in opening order: opened after it, with their element or one of
 * their `exclude` elements inside its element, or inside the element of a layer nested in it.
 */
function nestedIn(parent: Layer): Layer[] {
  const nested: Layer[] = [];
  if (parent.element === null) {
    return nested;
  }
  const holders: HTMLElement[] = [parent.element];
  for (const layer of layers) {
    if (layer.order <= parent.order) {
      continue;
    }
    const reached = [layer.element, ...(layer.options.exclude?.() ?? [])].filter((element) =>
      isPresent(element),
    );
    if (reached.some((element) => holders.some((holder) => containsComposed(holder, element)))) {
      nested.push(layer);
      if (layer.element !== null) {
        holders.push(layer.element);
      }
    }
  }
  return nested;
}

/**
 * Track an overlay layer, such as the content of a popover or a dialog, and report the
 * interactions that dismiss it; returns the function that stops (the cleanup of a `dismiss`
 * effect). The layer closes nothing itself: its machine decides (`closeOnEscape`,
 * `closeOnInteractOutside`).
 *
 * The layer goes on a stack, in the order `trackLayer` is called (a layer opened from another
 * one is above it), and starts once its element is rendered (see `whenRendered`). Then:
 *
 * - Escape goes to the top-most layer only (`onEscapeKeyDown`), unless an element of the page
 *   used it first.
 * - A press outside goes to the top-most layer only (`onPointerDownOutside`), and only outside
 *   its element, its `exclude` elements and the layers above it: one layer closes per press.
 * - Focus moving outside goes to every layer it left (`onFocusOutside`). A layer above, even
 *   portalled out of its parent's DOM, counts as inside its parent.
 * - When the layer closes, the layers nested in it hear it (`onParentClose`), top-most first:
 *   a popover opened from a dialog closes with the dialog, even when the dialog is closed by
 *   its owner.
 * - Each rendered layer and its `styleTargets` get `--layer-index`: their place in the stack,
 *   from 0. Kits stack them with `z-index: calc(var(--ct-layer-overlay) + var(--layer-index, 0))`.
 *   It is written inline, so React must not render `--layer-index` in their `style`.
 *
 * @example
 * dismiss: ({ send }) =>
 *   trackLayer(() => dom.getContent(), {
 *     exclude: () => [dom.getTrigger()],
 *     styleTargets: () => [dom.getPositioner()],
 *     onEscapeKeyDown: () => {
 *       send({ type: 'ESCAPE' });
 *     },
 *     onPointerDownOutside: () => {
 *       send({ type: 'INTERACT_OUTSIDE' });
 *     },
 *     onFocusOutside: () => {
 *       send({ type: 'INTERACT_OUTSIDE' });
 *     },
 *     onParentClose: () => {
 *       send({ type: 'CLOSE' });
 *     },
 *   }),
 */
export function trackLayer(element: ElementSource, options: LayerOptions = {}): () => void {
  const layer: Layer = { order: reserveOrder(), options, element: null, styled: new Set() };
  layers.push(layer);
  const stop = whenRendered(element, 'layer', (rendered) => {
    layer.element = rendered;
    layerOrders.set(rendered, layer.order);
    const stopListening = listenTo(rendered.ownerDocument);
    changed();
    return stopListening;
  });
  let done = false;
  return () => {
    if (done) {
      return;
    }
    done = true;
    // While the element is still known: the layers opened from inside it.
    const nested = nestedIn(layer);
    stop();
    layers.splice(layers.indexOf(layer), 1);
    layer.element = null;
    if (pendingTouch?.layer === layer) {
      pendingTouch = null;
    }
    clearLayerIndex(layer);
    changed();
    for (const child of nested.toReversed()) {
      // An earlier report may have closed it, and with it the ones nested in it.
      if (layers.includes(child)) {
        child.options.onParentClose?.();
      }
    }
  };
}
