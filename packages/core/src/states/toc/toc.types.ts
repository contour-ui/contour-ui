/** A heading of the page, as the table of contents lists it. */
export interface TocItem {
  /** The id of the heading element, which the item links to as `#value`. */
  readonly value: string;
  /** The level of the heading: 2 for an `h2`, 3 for an `h3`, and so on. */
  readonly depth: number;
}

/** What `onActiveChange` receives. */
export interface TocActiveChangeDetails {
  /** The ids of the active headings. */
  readonly activeIds: readonly string[];
  /** The items of the active headings, in the order of `items`. */
  readonly activeItems: readonly TocItem[];
}

/**
 * Where a heading is, relative to the observed area of its scroll container: `above` once it
 * has scrolled up out of the area, `inside` while it is in the area, `below` until it gets there.
 */
export type TocHeadingPosition = 'above' | 'inside' | 'below';

/** The position of one heading, as the platform reports it. */
export interface TocHeadingVisibility {
  /** The id of the heading: the `value` of its item. */
  readonly value: string;
  readonly position: TocHeadingPosition;
}

/**
 * How the platform scrolls to a heading: `smooth` animates, `instant` jumps, and `auto` does what
 * the scroll container does by default (on the DOM, its CSS `scroll-behavior`).
 */
export type TocScrollBehavior = 'auto' | 'instant' | 'smooth';

/** What the owner of a table of contents passes. Every prop but `items` is optional. */
export interface TocInput {
  /** The headings of the page, in the order of the page. */
  readonly items: readonly TocItem[];
  /**
   * The ids of the active headings, controlled by the owner. While it is defined, a change only
   * calls `onActiveChange`; the active headings change when the owner passes the new ids.
   */
  readonly activeIds?: readonly string[] | undefined;
  /**
   * The active headings of a table of contents that keeps them itself, until the platform first
   * reports where the headings are. Read once, on creation.
   *
   * @defaultValue []
   */
  readonly defaultActiveIds?: readonly string[] | undefined;
  /**
   * Called with the new active headings, controlled or not. Not called for the same ids in the
   * same order.
   */
  readonly onActiveChange?: ((details: TocActiveChangeDetails) => void) | undefined;
  /**
   * The observed area, as margins of the scroll container in the CSS shorthand, in `px` or `%`:
   * negative values shrink it, positive ones grow it. By default it runs from 20px below the top
   * down to 60% of the height.
   *
   * @defaultValue '-20px 0px -40% 0px'
   */
  readonly rootMargin?: string | undefined;
  /**
   * How much of a heading, from 0 to 1, has to be in the observed area to count as in it; with a
   * list, the smallest value. `0`: any part of it.
   *
   * @defaultValue 0
   */
  readonly threshold?: number | readonly number[] | undefined;
  /**
   * A function that returns the scroll container of the headings, in the terms of the platform
   * (on the DOM, an `HTMLElement`), called when the observation starts. Without it, or when it
   * returns nothing, the headings scroll with the page.
   */
  readonly scrollEl?: (() => unknown) | undefined;
  /**
   * How `scrollTo` scrolls to a heading, unless a call says otherwise.
   *
   * @defaultValue `'smooth'`, or `'auto'` when the user prefers reduced motion (the platform
   * knows)
   */
  readonly scrollBehavior?: TocScrollBehavior | undefined;
}

/** What the machine reads through `prop()`: the input with the observed area filled in. */
export interface TocProps extends TocInput {
  readonly rootMargin: string;
  readonly threshold: number | readonly number[];
}

/** `observing`: the only state, in which the platform reports where the headings are. */
export type TocState = 'observing';

/**
 * The events of the table of contents machine.
 *
 * - `VISIBILITY.CHANGE`: the platform reports the positions of headings that moved relative
 *   to the observed area, or of every heading, when the observation starts.
 * - `ACTIVE_IDS.SET`: make these headings active, until the next visibility change.
 * - `SCROLL_TO`: scroll to the heading `value`, the way `behavior` says, or else `scrollBehavior`.
 * - `OBSERVER.RESTART`: observe the headings again. Sent by the machine itself when `items`,
 *   `rootMargin` or `threshold` change.
 */
export type TocEvent =
  | {
      readonly type: 'VISIBILITY.CHANGE';
      readonly headings: readonly TocHeadingVisibility[];
    }
  | { readonly type: 'ACTIVE_IDS.SET'; readonly activeIds: readonly string[] }
  | {
      readonly type: 'SCROLL_TO';
      readonly value: string;
      readonly behavior?: TocScrollBehavior | undefined;
    }
  | { readonly type: 'OBSERVER.RESTART' };

/** The types the table of contents machine is made of (see `MachineSchema`). */
export interface TocSchema {
  input: TocInput;
  props: TocProps;
  context: {
    /** The ids of the active headings: controlled by the `activeIds` prop, or owned. */
    activeIds: readonly string[];
    /** Where each heading of `items` was last reported to be. Owned by the machine. */
    positions: ReadonlyMap<string, TocHeadingPosition>;
  };
  state: TocState;
  event: TocEvent;
  action: 'applyVisibility' | 'forgetRemovedHeadings' | 'setActiveIds' | 'restartObserver';
  guard: never;
  delay: never;
  /**
   * Scroll the heading `event.value` of a `SCROLL_TO` to the top of the container that
   * `prop('scrollEl')` returns, or of the page, as `event.behavior ?? prop('scrollBehavior')`
   * says; the platform's default when both are undefined.
   */
  platformAction: 'scrollToHeading';
  /**
   * While the machine runs: find the heading of every item in `prop('items')`, observe them in
   * the area that `prop('rootMargin')` and `prop('threshold')` set, and send
   * `VISIBILITY.CHANGE` with the positions of every heading once, then of the headings whose
   * position changed. A heading that skips the area in one jump, from below to above it or
   * back, counts as moved.
   */
  platformEffect: 'observeHeadings';
}

/** The state of one item, as `getItemState` returns it. */
export interface TocItemState {
  /** Whether its heading is active. */
  readonly active: boolean;
  /** Whether it is the first active item, in the order of `items`. */
  readonly first: boolean;
  /** Whether it is the last active item, in the order of `items`. */
  readonly last: boolean;
  /** The level of its heading. */
  readonly depth: number;
}

/** What `scrollTo` takes besides the heading. */
export interface TocScrollToDetails {
  /** How to scroll this time, instead of `scrollBehavior`. */
  readonly behavior?: TocScrollBehavior | undefined;
}

/** The state and actions of a table of contents, as `connect` returns them: no DOM, no platform. */
export interface TocApi {
  /** The headings of the page, as the owner passed them. */
  readonly items: readonly TocItem[];
  /**
   * The ids of the active headings: the headings in the observed area, in the order of `items`;
   * when none is, the last heading scrolled past it.
   */
  readonly activeIds: readonly string[];
  /** The items of the active headings, in the order of `items`. */
  readonly activeItems: readonly TocItem[];
  /** The state of an item: whether it is active, the first or the last active one, its depth. */
  readonly getItemState: (item: TocItem) => TocItemState;
  /**
   * Make these headings active, until the next visibility change. The change is reported
   * through `onActiveChange`; controlled ids change when the owner passes them back.
   */
  readonly setActiveIds: (activeIds: readonly string[]) => void;
  /** Scroll to the heading with this id, in its scroll container or the page. */
  readonly scrollTo: (value: string, details?: TocScrollToDetails) => void;
}
