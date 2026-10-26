import type { toc } from '@contour-ui/core';

/** A heading to observe: the id of its item and its element. */
export interface ObservedHeading {
  readonly value: string;
  readonly element: Element;
}

/** What {@link observeHeadings} takes. */
export interface ObserveHeadingsOptions {
  /** The headings, in the order of the page. */
  readonly headings: readonly ObservedHeading[];
  /** The scroll container of the headings, or `null` for the viewport. */
  readonly root: Element | null;
  /** The margins of the observed area, as `IntersectionObserver` takes them. */
  readonly rootMargin: string;
  /** How much of a heading has to be in the area; with a list, the smallest value counts. */
  readonly threshold: number | readonly number[];
  /** Called with the positions of every heading once, then with the positions that change. */
  readonly onChange: (headings: toc.HeadingVisibility[]) => void;
}

/**
 * How far the second observed area reaches above the scroll container: far enough to hold
 * every heading of a page, and short of the largest coordinates browsers lay out.
 */
const FAR_ABOVE = '10000000px';

/**
 * The margins of the area that runs from far above the scroll container down to the bottom of
 * the observed area: a heading in it has reached the observed area, or scrolled past it.
 */
function reachedAreaMargin(rootMargin: string): string {
  // The CSS margin shorthand: one to four values, the missing ones copied from the others.
  const [top = '0px', right = top, bottom = top, left = right] = rootMargin
    .split(/\s+/u)
    .filter((part) => part !== '');
  return `${FAR_ABOVE} ${right} ${bottom} ${left}`;
}

interface HeadingState {
  readonly value: string;
  /** In the observed area, by `threshold`. */
  inside: boolean;
  /** Above the bottom of the observed area: in it, or scrolled past it. */
  reached: boolean;
  /** The position last reported. */
  reported: toc.HeadingPosition | undefined;
}

const positionOf = (heading: HeadingState): toc.HeadingPosition => {
  if (heading.inside) {
    return 'inside';
  }
  return heading.reached ? 'above' : 'below';
};

/**
 * Observe where headings are relative to an area of their scroll container, with two
 * `IntersectionObserver`s: one on the area itself, and one on everything above its bottom.
 * The second one tells a heading above the area from one below it, also when a jump (a drag
 * of the scroll bar, a link) carries it across the area between two frames, where the first
 * one sees nothing.
 *
 * Positions are reported once both observers have reported every heading, then whenever one
 * changes. Returns the function that stops observing; nothing is reported after it.
 *
 * @example
 * const stop = observeHeadings({
 *   headings: [{ value: 'install', element: document.getElementById('install') }],
 *   root: null,
 *   rootMargin: '-20px 0px -40% 0px',
 *   threshold: 0,
 *   onChange: (headings) => send({ type: 'VISIBILITY.CHANGE', headings }),
 * });
 */
export function observeHeadings({
  headings,
  root,
  rootMargin,
  threshold,
  onChange,
}: ObserveHeadingsOptions): () => void {
  const thresholds = typeof threshold === 'number' ? [threshold] : [...threshold];
  const least = thresholds.length === 0 ? 0 : Math.min(...thresholds);
  const states = new Map<Element, HeadingState>();
  const heard = new Set<IntersectionObserver>();
  let stopped = false;

  const report = (): void => {
    // Until both observers have answered once, a heading may still be unknown to one of them.
    if (stopped || heard.size < 2) {
      return;
    }
    const changed: toc.HeadingVisibility[] = [];
    for (const heading of states.values()) {
      const position = positionOf(heading);
      if (position !== heading.reported) {
        heading.reported = position;
        changed.push({ value: heading.value, position });
      }
    }
    if (changed.length > 0) {
      onChange(changed);
    }
  };

  const area = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        const heading = states.get(entry.target);
        if (heading !== undefined) {
          heading.inside = entry.isIntersecting && entry.intersectionRatio >= least;
        }
      }
      heard.add(observer);
      report();
    },
    { root, rootMargin, threshold: thresholds },
  );
  const reached = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        const heading = states.get(entry.target);
        if (heading !== undefined) {
          heading.reached = entry.isIntersecting;
        }
      }
      heard.add(observer);
      report();
    },
    { root, rootMargin: reachedAreaMargin(rootMargin), threshold: 0 },
  );

  for (const { value, element } of headings) {
    states.set(element, { value, inside: false, reached: false, reported: undefined });
    area.observe(element);
    reached.observe(element);
  }

  return () => {
    // Entries already queued may still arrive after `disconnect`.
    stopped = true;
    area.disconnect();
    reached.disconnect();
  };
}
