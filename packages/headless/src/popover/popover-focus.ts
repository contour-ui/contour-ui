import { containsComposed, getActiveElement } from '../platform/dom.ts';
import { moveFocusIn, returnFocus, trapFocus } from '../platform/focus-trap.ts';
import { scrollContainerOf, scrollIntoContainer } from '../platform/scroll.ts';
import {
  getFirstTabbable,
  getLastTabbable,
  getTabbables,
  isFocusable,
} from '../platform/tabbable.ts';
import type { FocusableElement } from '../platform/tabbable.ts';
import { resolveElement } from '../platform/when-rendered.ts';
import type { ElementSource } from '../platform/when-rendered.ts';

/** A function that returns an element to focus, such as the `initialFocusEl` of a popover. */
export type FocusTarget = () => HTMLElement | null | undefined;

/** The elements of a popover that focus moves between. */
export interface PopoverFocusElements {
  readonly trigger: () => HTMLElement | null;
  readonly content: () => HTMLElement | null;
}

/** Where focus goes as a popover opens, while it is open, and as it closes. */
export interface PopoverFocus {
  /**
   * As the popover opens (`setInitialFocus`): remember the element with focus, and whether focus
   * is to move in (`autoFocus`). The move itself waits for {@link PopoverFocus.start}.
   */
  readonly open: (autoFocus: boolean) => void;
  /**
   * While the popover is open (the `trapFocus` effect, which starts in every open popover): move
   * focus into the content on the next frame if it has just opened (see `moveFocusIn`): to
   * `initialFocus()`, else its first tabbable element, else the content itself; and keep focus
   * inside when `trap` is set. Returns the function that stops both, on close and when the
   * service stops: a popover unmounted before its first frame leaves nothing waiting for its
   * content.
   */
  readonly start: (initialFocus: FocusTarget, trap: boolean) => () => void;
  /**
   * Once the open popover has its first position (the `position` effect), which gives the
   * content its size: scroll the element focus moved to as the popover opened into view, in a
   * scroll container inside the content and nowhere else. Focus moved in without scrolling, on
   * the frame before, while the content was not in place yet.
   */
  readonly reveal: () => void;
  /**
   * As the popover closes (`restoreFocus`), once its effects have stopped: when `restoreFocus` is
   * set, move focus back on the next frame (see `returnFocus`) to the first of `finalFocus()`, the
   * element that had focus before it opened, and the trigger that can take focus then. Focus that
   * has moved on to another element outside the content stays there.
   */
  readonly close: (restoreFocus: boolean, finalFocus: FocusTarget) => void;
}

/**
 * The focus moves of one popover, over the focus functions of `platform/`. The trap only keeps
 * focus in: the moves in and back are the machine's own platform actions.
 *
 * @example
 * const focus = createPopoverFocus({ trigger: () => trigger, content: () => content });
 * focus.open(prop('autoFocus'));
 * const stop = focus.start(() => options.initialFocusEl?.(), prop('modal'));
 */
export function createPopoverFocus(elements: PopoverFocusElements): PopoverFocus {
  /** Set when the popover opens, until it closes: the open popover still moves focus in. */
  let focusPending = false;
  /** The element that had focus when the popover opened. */
  let focusedBefore: Element | null = null;
  const ownerDocument = (): Document =>
    (elements.trigger() ?? elements.content())?.ownerDocument ?? document;

  return {
    open: (autoFocus) => {
      focusedBefore = getActiveElement(ownerDocument());
      focusPending = autoFocus;
    },
    start: (initialFocus, trap) => {
      const stops: Array<() => void> = [];
      if (focusPending) {
        stops.push(moveFocusIn(elements.content, { initialFocus }));
      }
      if (trap) {
        // Focus moves in above and goes back with `close`: the trap only keeps it in.
        stops.push(trapFocus(elements.content, { autoFocus: false, restoreFocus: false }));
      }
      return () => {
        for (const stop of stops.toReversed()) {
          stop();
        }
      };
    },
    reveal: () => {
      const content = elements.content();
      if (!focusPending || content === null) {
        return;
      }
      const active = getActiveElement(content.ownerDocument);
      if (active === null || active === content || !containsComposed(content, active)) {
        return;
      }
      // Only a container inside the content scrolls: never the page, nor the parents of a
      // popover rendered in place.
      const container = scrollContainerOf(active);
      if (container !== null && containsComposed(content, container)) {
        scrollIntoContainer(active, { container });
      }
    },
    close: (restoreFocus, finalFocus) => {
      const before = focusedBefore;
      focusPending = false;
      focusedBefore = null;
      if (!restoreFocus) {
        return;
      }
      // Read on the frame focus goes back.
      const target = (): Element | null =>
        [finalFocus(), before, elements.trigger()].find(
          (element): element is Element => element instanceof Element && isFocusable(element),
        ) ?? null;
      returnFocus(target, { from: elements.content() });
    },
  };
}

/** Whether `node` follows `reference` in document order. */
function follows(reference: Element, node: Element): boolean {
  return (reference.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

/** The first element Tab reaches after `trigger`, outside it and outside `content`. */
function tabbableAfter(trigger: Element, content: Element): FocusableElement | undefined {
  return getTabbables(trigger.ownerDocument.body).find(
    (element) =>
      follows(trigger, element) &&
      !trigger.contains(element) &&
      !containsComposed(content, element),
  );
}

/**
 * Where Tab (or Shift+Tab, `backward`) goes from `active` when the content sits right after the
 * trigger in the Tab order; `null` where the browser's own order is right.
 */
function destination(
  active: Element | null,
  trigger: HTMLElement,
  content: HTMLElement,
  backward: boolean,
): FocusableElement | null {
  if (active === null) {
    return null;
  }
  const first = getFirstTabbable(content);
  const last = getLastTabbable(content);
  // Content with nothing to tab to is a stop of its own: it takes focus (`tabIndex={-1}`).
  const own = isFocusable(content) ? content : null;
  if (containsComposed(content, active)) {
    if (backward) {
      return active === content || active === first ? trigger : null;
    }
    return active === (last ?? content) ? (tabbableAfter(trigger, content) ?? null) : null;
  }
  if (backward) {
    return active === tabbableAfter(trigger, content) ? (last ?? own) : null;
  }
  return active === trigger ? (first ?? own) : null;
}

/**
 * Keep content rendered elsewhere, such as a popover portalled to the end of the page, in the
 * Tab order right after its trigger, as if it were rendered there; returns the function that
 * stops (the cleanup of a `keepTabOrder` effect).
 *
 * - **Tab** on the trigger moves into the content: to its first tabbable element, or to the
 *   content itself when it has none (it then needs `tabIndex={-1}`).
 * - **Tab** on the last element of the content moves on to the first element after the
 *   trigger, outside the content; with nothing there, the browser takes it.
 * - **Shift+Tab** on the first element of the content moves back to the trigger, and Shift+Tab
 *   on the element after the trigger moves into the content, to its last element.
 *
 * Elsewhere, Tab keeps its own order. A Tab that an element used before (`defaultPrevented`)
 * is left alone. The elements are read on every key.
 *
 * @example
 * keepTabOrder: ({ prop }) =>
 *   prop('portalled') && !prop('modal') ? keepTabOrder(getTrigger, getContent) : undefined,
 */
export function keepTabOrder(trigger: ElementSource, content: ElementSource): () => void {
  const doc = resolveElement(trigger)?.ownerDocument ?? document;
  const onKeyDown = (event: KeyboardEvent): void => {
    if (
      event.key !== 'Tab' ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.defaultPrevented
    ) {
      return;
    }
    const triggerElement = resolveElement(trigger);
    const contentElement = resolveElement(content);
    if (triggerElement === null || contentElement === null) {
      return;
    }
    const target = destination(
      getActiveElement(doc),
      triggerElement,
      contentElement,
      event.shiftKey,
    );
    if (target !== null) {
      event.preventDefault();
      target.focus();
    }
  };
  doc.addEventListener('keydown', onKeyDown);
  return () => {
    doc.removeEventListener('keydown', onKeyDown);
  };
}
