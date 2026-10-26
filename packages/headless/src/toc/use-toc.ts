import { toc } from '@contour-ui/core';
import type { Platform } from '@contour-ui/core';
import { useMachine } from '@contour-ui/core/react';
import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, RefCallback } from 'react';

import { schedule } from '../platform/clock.ts';
import { observeHeadings } from './toc-observer.ts';
import type { ObservedHeading } from './toc-observer.ts';
import {
  focusHeading,
  scrollBehaviorOf,
  scrollIntoContainer,
  scrollToHeading,
} from './toc-scroll.ts';

/** Props of {@link useToc}: the input of the toc machine of `@contour-ui/core`, for the DOM. */
export interface UseTocProps extends Omit<toc.Input, 'scrollEl'> {
  /**
   * A function that returns the scroll container of the headings, called when the observation
   * starts. Without it, or when it returns `null`, the headings scroll with the page.
   */
  readonly scrollEl?: (() => HTMLElement | null) | undefined;
  /**
   * Whether to scroll the table of contents' own scroll container, when it is in one, so that
   * the first active item stays in view. The page never scrolls for it.
   *
   * @defaultValue true
   */
  readonly autoScroll?: boolean | undefined;
}

/** What every part of a table of contents carries. */
export interface TocPartAttributes<Part extends string> {
  readonly 'data-scope': 'toc';
  readonly 'data-part': Part;
}

/** Props of the root: its element, which the hook measures the items in. */
export interface TocRootAttributes extends TocPartAttributes<'root'> {
  readonly ref: RefCallback<HTMLElement>;
  /** The id of the title, once a title element is mounted. */
  readonly 'aria-labelledby': string | undefined;
}

/** Props of the title: an id the root points to, and a ref that tells the root it is there. */
export interface TocTitleAttributes extends TocPartAttributes<'title'> {
  readonly id: string;
  readonly ref: RefCallback<HTMLElement>;
}

/** Props of an item. */
export interface TocItemAttributes extends TocPartAttributes<'item'> {
  /** The id of the heading. */
  readonly 'data-value': string;
  /** The level of the heading. */
  readonly 'data-depth': number;
  /** Present, empty, while the heading is active. */
  readonly 'data-active': '' | undefined;
}

/** Props of a link: to the heading, which a click scrolls to. */
export interface TocLinkAttributes extends TocPartAttributes<'link'> {
  readonly href: string;
  readonly 'data-value': string;
  /** Present, empty, while the heading is active. */
  readonly 'data-active': '' | undefined;
  /** `true` on the link of the first active heading. */
  readonly 'aria-current': 'true' | undefined;
  readonly onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}

/** The custom properties that place the indicator. */
export type TocIndicatorStyle = Readonly<
  CSSProperties & Partial<Record<'--top' | '--left' | '--width' | '--height', string>>
>;

/**
 * Props of the indicator: hidden from assistive technology, and from sight while no item is
 * active. `--top`, `--left`, `--width` and `--height` hold the box around the active items, in
 * pixels, relative to the padding box of the root.
 */
export interface TocIndicatorAttributes extends TocPartAttributes<'indicator'> {
  readonly 'aria-hidden': true;
  readonly hidden: boolean;
  readonly style: TocIndicatorStyle;
}

/** What {@link useToc} returns: the toc API and the props of each element. */
export interface UseTocReturn extends toc.Api {
  readonly getRootProps: () => TocRootAttributes;
  readonly getTitleProps: () => TocTitleAttributes;
  readonly getListProps: () => TocPartAttributes<'list'>;
  readonly getItemProps: (item: toc.Item) => TocItemAttributes;
  readonly getLinkProps: (item: toc.Item) => TocLinkAttributes;
  readonly getIndicatorProps: () => TocIndicatorAttributes;
}

/** The box around the active items, relative to the padding box of the root. */
interface IndicatorRect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

/** The scroll container `scrollEl` returns, if it is an element. */
function scrollContainer(scrollEl: (() => unknown) | undefined): HTMLElement | null {
  const element = scrollEl?.();
  return element instanceof HTMLElement ? element : null;
}

/**
 * The heading with this id, in the document of the scroll container, or of the page. The id is
 * escaped: ids made from titles may start with a digit, which a selector does not take as is.
 */
function headingById(container: HTMLElement | null, id: string): HTMLElement | null {
  return (container?.ownerDocument ?? document).querySelector<HTMLElement>(`#${CSS.escape(id)}`);
}

/**
 * The DOM platform of the toc machine: the `setTimeout` clock, headings observed with
 * `IntersectionObserver` (see `observeHeadings`), and scrolling to a heading in its scroll
 * container or the page. A module-level constant, since `useMachine` reads it once; what an
 * instance needs, it reads from the props.
 */
const platform: Platform<toc.Schema> = {
  schedule,
  actions: {
    scrollToHeading: ({ event, prop }) => {
      if (event.type !== 'SCROLL_TO') {
        return;
      }
      const container = scrollContainer(prop('scrollEl'));
      const heading = headingById(container, event.value);
      if (heading !== null) {
        const behavior = scrollBehaviorOf(event.behavior ?? prop('scrollBehavior'));
        scrollToHeading(heading, container, behavior);
      }
    },
  },
  effects: {
    observeHeadings: ({ prop, send }) => {
      const container = scrollContainer(prop('scrollEl'));
      const headings: ObservedHeading[] = [];
      for (const { value } of prop('items')) {
        const element = headingById(container, value);
        if (element !== null) {
          headings.push({ value, element });
        }
      }
      if (headings.length === 0) {
        return undefined;
      }
      return observeHeadings({
        headings,
        root: container,
        rootMargin: prop('rootMargin'),
        threshold: prop('threshold'),
        onChange: (positions) => {
          send({ type: 'VISIBILITY.CHANGE', headings: positions });
        },
      });
    },
  },
};

/** Whether two lists hold the same headings at the same depths, in the same order. */
function sameItems(a: readonly toc.Item[], b: readonly toc.Item[]): boolean {
  return (
    a.length === b.length &&
    a.every((item, index) => item.value === b[index]?.value && item.depth === b[index]?.depth)
  );
}

/** The numbers of a threshold, as a list. */
const thresholdList = (value: toc.Input['threshold']): readonly number[] =>
  value === undefined ? [] : [value].flat();

/** Whether two thresholds are the same numbers. */
function sameThreshold(a: toc.Input['threshold'], b: toc.Input['threshold']): boolean {
  const first = thresholdList(a);
  const second = thresholdList(b);
  return (
    typeof a === typeof b &&
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

/**
 * `value`, or the one of an earlier render while the two are equal: a new array with the same
 * content keeps the identity the machine watches, so it does not observe the headings again.
 */
function useStableValue<T>(value: T, isEqual: (a: T, b: T) => boolean): T {
  const [stable, setStable] = useState(value);
  if (stable !== value && !isEqual(stable, value)) {
    // Updates during render are for state derived from props: React renders again at once.
    setStable(value);
    return value;
  }
  return stable;
}

/** The item element of a heading inside the root. */
function findItem(root: HTMLElement, value: string): HTMLElement | null {
  for (const item of root.querySelectorAll<HTMLElement>('[data-scope="toc"][data-part="item"]')) {
    if (item.dataset['value'] === value) {
      return item;
    }
  }
  return null;
}

/** The box around the items of `first` and `last`, relative to the padding box of the root. */
function measureIndicator(root: HTMLElement, first: string, last: string): IndicatorRect | null {
  const firstItem = findItem(root, first);
  const lastItem = findItem(root, last) ?? firstItem;
  if (firstItem === null || lastItem === null) {
    return null;
  }
  const box = root.getBoundingClientRect();
  // Where the padding box starts, in the scrolled content of the root.
  const x = box.left + root.clientLeft - root.scrollLeft;
  const y = box.top + root.clientTop - root.scrollTop;
  const start = firstItem.getBoundingClientRect();
  const end = lastItem.getBoundingClientRect();
  const left = Math.min(start.left, end.left);
  return {
    top: start.top - y,
    left: left - x,
    width: Math.max(start.right, end.right) - left,
    height: end.bottom - start.top,
  };
}

const sameRect = (a: IndicatorRect | null, b: IndicatorRect | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height);

/** Whether a click on a link should follow it in this tab, as a plain left click does. */
function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  const { target } = event.currentTarget;
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    (target === '' || target === '_self')
  );
}

/**
 * Run the toc machine of `@contour-ui/core` in a component, on the DOM platform: its API
 * (`items`, `activeIds`, `activeItems`, `getItemState()`, `setActiveIds()`, `scrollTo()`) and
 * the props of the root, the title, the list, the items, the links and the indicator.
 * `Toc.Root` calls it; call it yourself to build the parts from your own elements.
 *
 * The headings are found by id when the observation starts: render them before the table of
 * contents starts, or pass new `items` once they are there. Items equal to the previous ones,
 * even in a new array, observe nothing again.
 *
 * @example
 * const api = useToc({ items });
 * <nav {...api.getRootProps()}>
 *   <ul {...api.getListProps()}>
 *     {items.map((item) => (
 *       <li key={item.value} {...api.getItemProps(item)}>
 *         <a {...api.getLinkProps(item)}>{titles[item.value]}</a>
 *       </li>
 *     ))}
 *   </ul>
 * </nav>;
 */
export function useToc(props: UseTocProps): UseTocReturn {
  const { autoScroll = true, ...input } = props;
  const items = useStableValue(input.items, sameItems);
  const threshold = useStableValue(input.threshold, sameThreshold);
  const service = useMachine(toc.machine, { ...input, items, threshold }, platform);
  const api = toc.connect(service);

  const rootRef = useRef<HTMLElement | null>(null);
  // A callback, so the root can be any element: a `ref` object would have to match its type.
  const setRoot = useCallback<RefCallback<HTMLElement>>((element) => {
    rootRef.current = element;
  }, []);
  const defaultTitleId = useId();
  const [titleId, setTitleId] = useState<string | undefined>(undefined);
  // Called by React with the title element and its cleanup: the root names itself after a
  // title only while there is one. After the first render, so hydration matches.
  const titleRef = useCallback<RefCallback<HTMLElement>>((element) => {
    if (element === null || element.id === '') {
      return undefined;
    }
    setTitleId(element.id);
    return () => {
      setTitleId(undefined);
    };
  }, []);

  const first = api.activeItems[0]?.value;
  const last = api.activeItems.at(-1)?.value;

  const [indicator, setIndicator] = useState<IndicatorRect | null>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root === null || first === undefined || last === undefined) {
      setIndicator(null);
      return undefined;
    }
    const measure = (): void => {
      const next = measureIndicator(root, first, last);
      setIndicator((current) => (sameRect(current, next) ? current : next));
    };
    measure();
    // Items move when the list changes, and grow or shrink with the width of the root and with
    // fonts that load later.
    const observer = new ResizeObserver(measure);
    const list = root.querySelector('[data-scope="toc"][data-part="list"]');
    for (const element of [root, list, findItem(root, first), findItem(root, last)]) {
      if (element !== null) {
        observer.observe(element);
      }
    }
    return () => {
      observer.disconnect();
    };
  }, [first, last]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!autoScroll || root === null || first === undefined) {
      return;
    }
    const item = findItem(root, first);
    if (item !== null) {
      scrollIntoContainer(item, {
        behavior: scrollBehaviorOf(service.prop('scrollBehavior')),
        // The headings' scroll container never scrolls for the table of contents.
        boundary: scrollContainer(service.prop('scrollEl')),
      });
    }
  }, [service, first, autoScroll]);

  return {
    ...api,
    getRootProps: () => ({
      'data-scope': 'toc',
      'data-part': 'root',
      ref: setRoot,
      'aria-labelledby': titleId,
    }),
    getTitleProps: () => ({
      'data-scope': 'toc',
      'data-part': 'title',
      id: defaultTitleId,
      ref: titleRef,
    }),
    getListProps: () => ({ 'data-scope': 'toc', 'data-part': 'list' }),
    getItemProps: (item) => ({
      'data-scope': 'toc',
      'data-part': 'item',
      'data-value': item.value,
      'data-depth': item.depth,
      'data-active': api.getItemState(item).active ? '' : undefined,
    }),
    getLinkProps: (item) => {
      const state = api.getItemState(item);
      return {
        'data-scope': 'toc',
        'data-part': 'link',
        href: `#${item.value}`,
        'data-value': item.value,
        'data-active': state.active ? '' : undefined,
        'aria-current': state.first ? 'true' : undefined,
        onClick: (event) => {
          // The owner's handler runs first: `event.preventDefault()` there cancels the scroll as
          // it cancels following the link. Clicks that open the link elsewhere are the browser's.
          if (event.defaultPrevented || !isPlainClick(event)) {
            return;
          }
          const container = scrollContainer(service.prop('scrollEl'));
          const heading = headingById(container, item.value);
          if (heading === null) {
            return;
          }
          event.preventDefault();
          api.scrollTo(item.value);
          focusHeading(heading);
          const url = new URL(location.href);
          url.hash = item.value;
          history.replaceState(history.state, '', url);
        },
      };
    },
    getIndicatorProps: () => ({
      'data-scope': 'toc',
      'data-part': 'indicator',
      'aria-hidden': true,
      hidden: indicator === null,
      style:
        indicator === null
          ? {}
          : {
              '--top': `${indicator.top}px`,
              '--left': `${indicator.left}px`,
              '--width': `${indicator.width}px`,
              '--height': `${indicator.height}px`,
            },
    }),
  };
}
