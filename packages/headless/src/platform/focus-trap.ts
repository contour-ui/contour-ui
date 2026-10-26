import { containsComposed, eventTarget, getActiveElement } from './dom.ts';
import { isInLayerAbove, reserveOrder } from './layer-stack.ts';
import { getFirstTabbable, getTabbables, isFocusable } from './tabbable.ts';
import type { FocusableElement } from './tabbable.ts';
import { resolveElement, whenRendered } from './when-rendered.ts';
import type { ElementSource } from './when-rendered.ts';

/** Options of {@link moveFocusIn}. */
export interface MoveFocusInOptions {
  /**
   * The element to focus, such as the `initialFocusEl` of a dialog. When it gives nothing, or an
   * element that cannot take focus, focus goes to the first tabbable element of the container,
   * or to the container itself.
   */
  readonly initialFocus?: (() => Element | null | undefined) | undefined;
}

/** Options of {@link returnFocus}. */
export interface ReturnFocusOptions {
  /**
   * The overlay that focus leaves. Focus still inside it, or nowhere, goes back; focus on any
   * other element stays there. Without it, only focus that is nowhere goes back.
   */
  readonly from?: ElementSource<Element> | undefined;
}

/** Options of {@link trapFocus}. */
export interface FocusTrapOptions extends MoveFocusInOptions {
  /**
   * Move focus into the container when the trap starts (see {@link moveFocusIn}).
   *
   * @defaultValue true
   */
  readonly autoFocus?: boolean | undefined;
  /**
   * Move focus back when the trap stops (see {@link returnFocus}): to `finalFocus()`, or to the
   * element that had focus when `trapFocus` was called (the trigger, as a rule).
   *
   * @defaultValue true
   */
  readonly restoreFocus?: boolean | undefined;
  /** Where focus goes back to when the trap stops, such as the `finalFocusEl` of a dialog. */
  readonly finalFocus?: (() => Element | null | undefined) | undefined;
}

/** A running focus trap. */
interface Trap {
  /** Its place in the opening order, shared with layers: the layers opened later are above it. */
  readonly order: number;
  readonly container: HTMLElement;
  /** The last element focused inside: focus that escapes goes back to it. */
  lastFocused: Element | null;
  /**
   * Whether the Tab being handled goes backward, until its focus move is over; `null`
   * otherwise.
   */
  tabBackward: boolean | null;
  /** Stops its listeners; `null` while it is paused. */
  stopListening: (() => void) | null;
}

/** The running traps, in opening order: the last one listens, the others are paused. */
const traps: Trap[] = [];

/** Whether an element is one that focus may go to. */
function canFocus(element: Element | null | undefined): element is FocusableElement {
  return element !== null && element !== undefined && isFocusable(element);
}

/**
 * Focus `container` the way a dialog that opens does: `initialFocus()`, focus already inside,
 * the first tabbable element, then the container itself. No scrolling: content that opens may
 * not be in place in its first frame.
 */
function focusInitial(
  container: HTMLElement,
  initialFocus: MoveFocusInOptions['initialFocus'],
): void {
  const preferred = initialFocus?.();
  if (canFocus(preferred)) {
    preferred.focus({ preventScroll: true });
    return;
  }
  if (containsComposed(container, getActiveElement(container.ownerDocument))) {
    return;
  }
  const first = getFirstTabbable(container) ?? container;
  first.focus({ preventScroll: true });
}

/**
 * Move focus into `container` once it is rendered (see `whenRendered`): to `initialFocus()`,
 * else the first tabbable element, else the container itself, which then needs
 * `tabIndex={-1}`. Focus already inside the container, such as on a field React focused for
 * `autoFocus`, stays there unless `initialFocus` names an element. The page does not scroll.
 * Returns the function that cancels it before it happens.
 *
 * For a popover that is not modal, which moves focus in without trapping it.
 *
 * @example
 * setInitialFocus: ({ prop }) => {
 *   moveFocusIn(() => dom.getContent(), { initialFocus: prop('initialFocusEl') });
 * },
 */
export function moveFocusIn(
  container: ElementSource,
  options: MoveFocusInOptions = {},
): () => void {
  return whenRendered(container, 'focus', (rendered) => {
    focusInitial(rendered, options.initialFocus);
    return () => undefined;
  });
}

/**
 * Move focus back to `target` (as a rule, the trigger) on the next frame, unless it has moved on
 * by then: focus still inside `from`, or nowhere, goes back; focus on another element stays,
 * such as a field the user pressed outside a popover, which closed it. The frame lets that
 * press finish moving focus first. Nothing happens when `target` cannot take focus then (it is
 * gone, or still inert). The page does not scroll. Returns the function that cancels it.
 *
 * `target` may be a getter: it is read on that frame.
 *
 * @example
 * restoreFocus: () => {
 *   returnFocus(focusedBeforeOpen, { from: () => dom.getContent() });
 * },
 */
export function returnFocus(
  target: ElementSource<Element>,
  options: ReturnFocusOptions = {},
): () => void {
  const frame = requestAnimationFrame(() => {
    const element = resolveElement(target);
    if (!canFocus(element)) {
      return;
    }
    const active = getActiveElement(element.ownerDocument);
    const from = resolveElement(options.from);
    if (active === null || (from !== null && containsComposed(from, active))) {
      element.focus({ preventScroll: true });
    }
  });
  return () => {
    cancelAnimationFrame(frame);
  };
}

/** Where focus that escaped `trap` goes: round to the far end after a Tab, else where it was. */
function bringBack(trap: Trap): void {
  const { container, lastFocused, tabBackward } = trap;
  let destination: Element | null;
  if (tabBackward === null) {
    destination =
      canFocus(lastFocused) && containsComposed(container, lastFocused)
        ? lastFocused
        : getFirstTabbable(container);
  } else {
    const tabbables = getTabbables(container);
    destination = (tabBackward ? tabbables.at(-1) : tabbables[0]) ?? null;
  }
  (canFocus(destination) ? destination : container).focus();
}

/** Listen for focus and Tab while `trap` is the active trap; returns the function that stops. */
function listen(trap: Trap): () => void {
  const { container } = trap;
  const doc = container.ownerDocument;
  const onFocusIn = (event: FocusEvent): void => {
    const target = eventTarget(event);
    if (target === null) {
      return;
    }
    // Inside first: the layer of the container itself may count as above the trap.
    if (containsComposed(container, target)) {
      trap.lastFocused = target;
      return;
    }
    if (!isInLayerAbove(trap.order, target)) {
      bringBack(trap);
    }
  };
  // After the page's handlers (React's included): a widget that uses Tab prevents its default.
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    // The browser moves focus after this event: an escape it causes goes round the trap.
    trap.tabBackward = event.shiftKey;
    requestAnimationFrame(() => {
      trap.tabBackward = null;
    });
    const active = getActiveElement(doc);
    const inside = containsComposed(container, active);
    if (event.defaultPrevented || (!inside && isInLayerAbove(trap.order, active))) {
      return;
    }
    const tabbables = getTabbables(container);
    const first = tabbables[0];
    const last = tabbables.at(-1);
    if (first === undefined || last === undefined) {
      event.preventDefault();
      container.focus();
      return;
    }
    if (event.shiftKey && (!inside || active === first || active === container)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (!inside || active === last)) {
      event.preventDefault();
      first.focus();
    }
  };
  doc.addEventListener('focusin', onFocusIn, true);
  doc.addEventListener('keydown', onKeyDown);
  return () => {
    doc.removeEventListener('focusin', onFocusIn, true);
    doc.removeEventListener('keydown', onKeyDown);
  };
}

/** Let the newest trap listen and pause the others. */
function syncTraps(): void {
  const active = traps.at(-1);
  for (const trap of traps) {
    if (trap === active) {
      trap.stopListening ??= listen(trap);
    } else {
      trap.stopListening?.();
      trap.stopListening = null;
    }
  }
}

/**
 * Keep focus inside `container` while the trap runs, as a modal dialog does; returns the
 * function that stops it (the cleanup of a `trapFocus` effect). It starts once the container is
 * rendered (see `whenRendered`).
 *
 * - **Start** (`autoFocus`): focus moves in, see {@link moveFocusIn}.
 * - **Tab** on the last tabbable element goes round to the first, **Shift+Tab** on the first
 *   (or on the container) to the last; with nothing tabbable inside, focus stays on the
 *   container. Tab from outside goes to the first element, Shift+Tab to the last. A Tab that an
 *   element used before (`defaultPrevented`) is left alone.
 * - **Focus that escapes** another way (a script, a press on something outside that is not
 *   inert) comes back: to the element focused last, or round the trap after a Tab.
 * - **Layers above** the trap, opened after it (see `trackLayer`), count as inside: focus may
 *   go to a popover opened from a dialog, portalled out of it, and Tab there is its own.
 * - **Nested traps:** the newest one is active; the others pause, and the one below resumes
 *   when it stops, leaving focus where it is until it moves.
 * - **Stop** (`restoreFocus`): focus goes back, see {@link returnFocus}: to `finalFocus()`, or
 *   to the element that had focus when `trapFocus` was called.
 *
 * @example
 * trapFocus: ({ prop }) =>
 *   trapFocus(() => dom.getContent(), {
 *     initialFocus: prop('initialFocusEl'),
 *     restoreFocus: prop('restoreFocus'),
 *     finalFocus: () => prop('finalFocusEl')?.() ?? dom.getTrigger(),
 *   }),
 */
export function trapFocus(container: ElementSource, options: FocusTrapOptions = {}): () => void {
  const { autoFocus = true, restoreFocus = true } = options;
  const order = reserveOrder();
  const focusedBefore = getActiveElement(resolveElement(container)?.ownerDocument ?? document);
  let started: Trap | null = null;
  const stop = whenRendered(container, 'focus', (rendered) => {
    const active = getActiveElement(rendered.ownerDocument);
    const trap: Trap = {
      order,
      container: rendered,
      lastFocused: containsComposed(rendered, active) ? active : null,
      tabBackward: null,
      stopListening: null,
    };
    started = trap;
    traps.push(trap);
    traps.sort((a, b) => a.order - b.order);
    syncTraps();
    if (autoFocus) {
      focusInitial(rendered, options.initialFocus);
    }
    return () => {
      traps.splice(traps.indexOf(trap), 1);
      trap.stopListening?.();
      trap.stopListening = null;
      syncTraps();
    };
  });
  let done = false;
  return () => {
    if (done) {
      return;
    }
    done = true;
    stop();
    const trap: Trap | null = started;
    if (trap !== null && restoreFocus) {
      returnFocus(() => options.finalFocus?.() ?? focusedBefore, { from: trap.container });
    }
  };
}
