import { resolveElement } from './when-rendered.ts';
import type { ElementSource } from './when-rendered.ts';

/**
 * The box of the element an indicator points at, in pixels, relative to the padding box of the
 * indicator's parent, in its scrolled content (so a scrolling list carries the indicator along).
 */
export interface IndicatorRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The custom properties an indicator gets, one per member of {@link IndicatorRect}, in `px`:
 * `--left`, `--top`, `--width`, `--height`.
 */
export const INDICATOR_PROPERTIES: Readonly<Record<keyof IndicatorRect, string>> = {
  left: '--left',
  top: '--top',
  width: '--width',
  height: '--height',
};

/**
 * Whether an element is laid out: not inside `display: none`, such as a closed popover or a
 * hidden panel.
 */
const isLaidOut = (element: Element): boolean => element.getClientRects().length > 0;

/**
 * The box of `target` relative to the padding box of `container`, in its scrolled content;
 * `null` while either is not laid out, as there is nothing to measure.
 *
 * @example
 * measureIndicator(selectedTrigger, list); // { left: 96, top: 0, width: 64, height: 32 }
 */
export function measureIndicator(target: Element, container: Element): IndicatorRect | null {
  if (!isLaidOut(target) || !isLaidOut(container)) {
    return null;
  }
  const box = container.getBoundingClientRect();
  // Where the padding box starts, in the scrolled content of the container.
  const x = box.left + container.clientLeft - container.scrollLeft;
  const y = box.top + container.clientTop - container.scrollTop;
  const rect = target.getBoundingClientRect();
  return { left: rect.left - x, top: rect.top - y, width: rect.width, height: rect.height };
}

const sameRect = (a: IndicatorRect | null, b: IndicatorRect | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height);

/**
 * Keep an indicator on an element: write the box of `target`, relative to the indicator's
 * parent, on the indicator as `--left`, `--top`, `--width` and `--height` (in `px`), and set
 * `hidden` on it while there is nothing to point at (no target, or one that is not laid out).
 * Returns the function that stops tracking; it leaves the indicator as it is.
 *
 * - The parent of the indicator is its containing block: give it `position: relative` (or any
 *   position) and the indicator `position: absolute`, then place and size the indicator with the
 *   properties, with a transition of your own to move it.
 * - The box is measured at once and again whenever the parent or the target changes size, and
 *   when the parent's subtree changes (elements added, removed, or text changing before the
 *   target): the target moves without resizing then.
 * - `target` may be a getter, read on every measure: an element rendered later, or replaced, is
 *   followed.
 * - An indicator that was hidden shows already in place, in the same frame: a transition does
 *   not run from where it was before, since a hidden element has no style to start from.
 *
 * Restart it (stop, then track the new element) when the indicator should point at another
 * element: the properties change in one go, and a transition moves the indicator there.
 *
 * @example
 * useLayoutEffect(() => trackIndicator(indicator, () => triggers.get(value)), [indicator, value]);
 */
export function trackIndicator(indicator: HTMLElement, target: ElementSource): () => void {
  const container = indicator.parentElement;
  let current: IndicatorRect | null = null;
  let observed: Element | null = null;

  const write = (next: IndicatorRect | null): void => {
    if (next !== null && !sameRect(current, next)) {
      for (const key of ['left', 'top', 'width', 'height'] as const) {
        indicator.style.setProperty(INDICATOR_PROPERTIES[key], `${next[key]}px`);
      }
    }
    current = next;
    // After the properties, so a shown indicator starts in place.
    indicator.hidden = next === null;
  };

  const resizeObserver = new ResizeObserver(() => {
    measure();
  });
  const follow = (element: Element | null): void => {
    if (element === observed) {
      return;
    }
    if (observed !== null) {
      resizeObserver.unobserve(observed);
    }
    observed = element;
    if (element !== null) {
      resizeObserver.observe(element);
    }
  };

  function measure(): void {
    const element = resolveElement(target);
    follow(element);
    write(element === null || container === null ? null : measureIndicator(element, container));
  }

  measure();
  if (container === null) {
    return () => {
      resizeObserver.disconnect();
    };
  }
  resizeObserver.observe(container);
  const mutationObserver = new MutationObserver(() => {
    measure();
  });
  mutationObserver.observe(container, { childList: true, subtree: true, characterData: true });
  return () => {
    resizeObserver.disconnect();
    mutationObserver.disconnect();
  };
}
