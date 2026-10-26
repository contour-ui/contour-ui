import type {
  ComputePositionConfig as FloatingConfig,
  ComputePositionReturn as FloatingResult,
  Platform,
} from '@floating-ui/core';

/** A side of the reference element. */
export type PlacementSide = 'top' | 'right' | 'bottom' | 'left';

/**
 * How the floating element lines up along its side: `start` aligns its start edge with the start
 * edge of the reference, `end` its end edge. On `top` and `bottom` the start edge is the left one
 * (the right one in right-to-left text); on `left` and `right` it is the top one.
 */
export type PlacementAlign = 'start' | 'end';

/**
 * Where the floating element goes: a side of the reference element, centered on it (`bottom`) or
 * aligned with its start or end edge (`bottom-start`). Twelve placements.
 */
export type Placement = PlacementSide | `${PlacementSide}-${PlacementAlign}`;

/**
 * How the floating element is positioned, as the CSS `position` it gets: `absolute` places it in
 * the coordinates of its offset parent, `fixed` in those of the viewport, for a reference inside
 * a fixed container.
 */
export type PositioningStrategy = 'absolute' | 'fixed';

/** The distance between the reference and the floating element along both axes, in px. */
export interface PositioningOffset {
  /** The gap between them, away from the side. */
  readonly mainAxis?: number | undefined;
  /**
   * A move along the side: to the right on `top` and `bottom` (to the left in right-to-left
   * text), down on `left` and `right`.
   */
  readonly crossAxis?: number | undefined;
}

/**
 * Where to put a floating element (a popover, a menu, a tooltip) next to its reference element,
 * and how to keep it in view. Every option is optional: positioning fills in the defaults below.
 * A component layers its own defaults under the owner's options with
 * {@link resolvePositioningOptions}.
 */
export interface PositioningOptions {
  /**
   * Where the floating element goes, before `flip` looks for room.
   *
   * @defaultValue 'bottom'
   */
  readonly placement?: Placement | undefined;
  /**
   * The gap between the reference and the floating element, in px. An object also moves the
   * floating element along its side (`crossAxis`).
   *
   * @defaultValue 0
   */
  readonly offset?: number | PositioningOffset | undefined;
  /**
   * Move the floating element when it has no room at its placement: to the opposite side, and
   * for an aligned placement, to the other alignment on the same side first. A list replaces
   * those placements: they are tried in order. `false` keeps the placement, even out of view.
   *
   * @defaultValue true
   */
  readonly flip?: boolean | readonly Placement[] | undefined;
  /**
   * Keep the floating element this far from the edges of the viewport (or of the scroll
   * container that clips it), in px: it slides along its side to stay in view, never past the
   * far edge of its reference. The same distance counts for `flip` (the room a side needs) and
   * `fitViewport` (the room the floating element may take). `true` is 0; `false` turns sliding
   * off, and the edges then count from 0.
   *
   * @defaultValue 0
   */
  readonly shift?: number | boolean | undefined;
  /**
   * Make the floating element as wide as its reference: positioning places it with that width,
   * and the adapter gives it that width (in the DOM, `width: var(--reference-width)`).
   *
   * @defaultValue false
   */
  readonly sameWidth?: boolean | undefined;
  /**
   * Fit the floating element into the room it has: positioning places it with its size capped
   * by the available size, and the adapter caps it (in the DOM, `max-width:
   * var(--available-width)` and `max-height: var(--available-height)`).
   *
   * @defaultValue false
   */
  readonly fitViewport?: boolean | undefined;
  /**
   * The CSS `position` of the floating element.
   *
   * @defaultValue 'absolute'
   */
  readonly strategy?: PositioningStrategy | undefined;
}

/**
 * {@link PositioningOptions} with every default filled in, as
 * {@link resolvePositioningOptions} returns them.
 */
export type ResolvedPositioningOptions = {
  readonly [K in keyof PositioningOptions]-?: Exclude<PositioningOptions[K], undefined>;
};

/**
 * The CSS custom properties positioning gives the floating element, ready to set. Its styles and
 * those of its children read them: `width: var(--reference-width)`, `max-height:
 * var(--available-height)`, `transform-origin: var(--transform-origin)`.
 */
export interface PositioningVariables {
  /** The width of the reference element (`120px`). */
  readonly '--reference-width': string;
  /** The height of the reference element. */
  readonly '--reference-height': string;
  /**
   * The width the floating element has before it crosses the edge of the viewport, less the
   * `shift` distance: its maximum width with `fitViewport`.
   */
  readonly '--available-width': string;
  /**
   * The height the floating element has before it crosses the edge of the viewport, less the
   * `shift` distance: its maximum height with `fitViewport`.
   */
  readonly '--available-height': string;
  /**
   * The edge of the floating element next to its reference, as a CSS `transform-origin`
   * (`top left` for `bottom-start`): the point a scale animation grows from.
   */
  readonly '--transform-origin': string;
}

/** The variables that size the floating element: all but `--transform-origin`. */
export type PositioningSizeVariables = Omit<PositioningVariables, '--transform-origin'>;

/** Where the floating element goes, and what to size and animate it with. Plain data. */
export interface PositioningResult {
  /**
   * The left edge of the floating element, in px: in the coordinates of its offset parent with
   * `absolute`, of the viewport with `fixed`. Not rounded.
   */
  readonly x: number;
  /** The top edge of the floating element, in px, in the same coordinates as `x`. */
  readonly y: number;
  /** The placement it ended up with, after `flip`. */
  readonly placement: Placement;
  readonly strategy: PositioningStrategy;
  /** The width of the reference element, in px. */
  readonly referenceWidth: number;
  /** The height of the reference element, in px. */
  readonly referenceHeight: number;
  /**
   * The width the floating element has room for at its placement, in whole px, less the `shift`
   * distance; never negative.
   */
  readonly availableWidth: number;
  /**
   * The height the floating element has room for at its placement, in whole px, less the `shift`
   * distance; never negative.
   */
  readonly availableHeight: number;
  /** The edge next to the reference, as a CSS `transform-origin` (`top left`). */
  readonly transformOrigin: string;
  /** The values above as CSS custom properties. */
  readonly variables: PositioningVariables;
}

/**
 * What positioning needs from its environment: the Floating UI platform that measures the
 * reference, the floating element and the area that clips it (in the DOM, `platform` of
 * `@floating-ui/dom`; in Soundor, rectangles from `getBoundingClientRect`), and optionally a way
 * to resize the floating element while its position is computed.
 */
export interface PositioningPlatform extends Platform {
  /**
   * Set the size variables on the floating element during the computation, so that the next
   * measurement of its size sees what they do to it. Positioning places the floating element
   * with the size the options give it either way; this adds what only the platform knows, such
   * as text that wraps at the new width.
   */
  readonly setVariables?:
    | ((floating: unknown, variables: PositioningSizeVariables) => void)
    | undefined;
}

/** What {@link computePosition} takes besides the elements: the options and the platform. */
export interface ComputePositionConfig extends PositioningOptions {
  readonly platform: PositioningPlatform;
  /**
   * The `computePosition` of the Floating UI package the platform comes from: positioning hands
   * it the middleware and the platform, wrapped to measure the floating element at the size the
   * options give it. The one of `@floating-ui/core` by default. The DOM passes the one of
   * `@floating-ui/dom`, which keeps caches of its own for the DOM platform during a computation.
   *
   * A method, so that its parameters are compared both ways: the one of `@floating-ui/dom`, which
   * takes DOM elements, fits.
   */
  compute?(
    reference: unknown,
    floating: unknown,
    config?: { readonly [K in keyof FloatingConfig]?: FloatingConfig[K] | undefined },
  ): Promise<FloatingResult>;
}
