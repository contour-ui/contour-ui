import { computePosition, resolvePositioningOptions } from '@contour-ui/core';
import type { Placement, PositioningOptions, PositioningVariables } from '@contour-ui/core';
import {
  autoUpdate,
  computePosition as computeDomPosition,
  platform as domPlatform,
} from '@floating-ui/dom';
import type { VirtualElement } from '@floating-ui/dom';
import type { CSSProperties } from 'react';

/**
 * What a floating element is placed next to: an element, or a virtual one that only has a
 * rectangle, such as a text selection or a point under the pointer. A virtual reference with a
 * `contextElement` follows the scroll containers of that element.
 */
export type PositionReference = Element | VirtualElement;

/** Options of {@link trackPosition}: where to place the floating element, and a callback. */
export interface TrackPositionOptions extends PositioningOptions {
  /**
   * Called with the placement the floating element ends up with, after `flip`: after the first
   * computation, then whenever it changes, never on every frame. Hand it to React for what
   * renders it, such as the `data-placement` of the content.
   */
  readonly onPlacementChange?: ((placement: Placement) => void) | undefined;
}

/** The variables tracking writes into the floating element. */
const VARIABLES: ReadonlyArray<keyof PositioningVariables> = [
  '--reference-width',
  '--reference-height',
  '--available-width',
  '--available-height',
  '--transform-origin',
];

/**
 * Where a positioner waits for its first computation: above its containing block by its own
 * height and a viewport more, out of sight, yet laid out, so that it can be measured.
 */
const OFF_SCREEN = 'translate(0px, calc(-100% - 100vh))';

/**
 * The inline style of a positioner, the element {@link trackPosition} moves, for its first
 * render (on the server too): at the top left corner of its containing block, and off screen
 * until the first computation, so that an opening popover never flashes at 0,0. Tracking then
 * writes the `transform` and the variables straight into the element; React leaves them alone
 * as long as this style does not change.
 *
 * The positioner is as wide as its content, whatever the width of its containing block
 * (`max-content`), or as wide as the reference with `sameWidth`; with `fitViewport`, the room it
 * has caps its size. Pass the options given to `trackPosition`.
 *
 * @example
 * <div {...api.getPositionerProps()} style={getPositionerStyle(positioning)}>
 *   <div {...api.getContentProps()} />
 * </div>
 */
export function getPositionerStyle(options?: PositioningOptions): CSSProperties {
  const { strategy, sameWidth, fitViewport } = resolvePositioningOptions(options);
  return {
    position: strategy,
    top: 0,
    left: 0,
    width: sameWidth ? 'var(--reference-width)' : 'max-content',
    ...(fitViewport
      ? { maxWidth: 'var(--available-width)', maxHeight: 'var(--available-height)' }
      : {}),
    transform: OFF_SCREEN,
  };
}

/**
 * Place a floating element next to its reference and keep it there: compute the position at
 * once, then whenever either element moves or changes size (scroll, resize, layout shifts; the
 * `autoUpdate` of `@floating-ui/dom`), with `computePosition` of `@contour-ui/core` on the
 * platform and the computation of `@floating-ui/dom`. Each result goes straight into the
 * floating element, without a React render: its
 * `transform` (rounded to device pixels), the variables (`--reference-width`,
 * `--reference-height`, `--available-width`, `--available-height`, `--transform-origin`) and
 * `data-placement`. Returns the function that stops tracking; it leaves the element where it
 * is, for an exit animation.
 *
 * Give the floating element the style of {@link getPositionerStyle}, with the same options.
 * Both elements must be in the document: an effect that starts as its machine opens, before
 * React renders the floating element, starts tracking once it is rendered. The first position
 * lands a few microtasks after the start, before the next paint: until then the element waits
 * off screen, so focus it with `preventScroll`.
 *
 * @example
 * // The `position` effect of a popover, once its positioner is rendered.
 * const stop = trackPosition(trigger, positioner, {
 *   ...prop('positioning'),
 *   onPlacementChange: (placement) => {
 *     send({ type: 'PLACEMENT.CHANGE', placement });
 *   },
 * });
 */
export function trackPosition(
  reference: PositionReference,
  floating: HTMLElement,
  options: TrackPositionOptions = {},
): () => void {
  const { onPlacementChange, ...positioning } = options;
  const view = floating.ownerDocument.defaultView;

  // The values written last: an unchanged one is not written again.
  const written = new Map<string, string>();
  const write = (property: string, value: string): void => {
    if (written.get(property) !== value) {
      written.set(property, value);
      floating.style.setProperty(property, value);
    }
  };
  const writeVariables = (variables: Partial<PositioningVariables>): void => {
    for (const name of VARIABLES) {
      const value = variables[name];
      if (value !== undefined) {
        write(name, value);
      }
    }
  };
  /** A coordinate on the grid of device pixels, where a translated element stays sharp. */
  const round = (value: number): number => {
    const ratio = view?.devicePixelRatio ?? 1;
    return Math.round(value * ratio) / ratio;
  };

  let computations = 0;
  let stopped = false;
  let placement: Placement | undefined;

  const update = async (): Promise<void> => {
    computations += 1;
    const computation = computations;
    // A computation that a newer one, or the cleanup, overtook writes nothing.
    const current = (): boolean => !stopped && computation === computations;
    const result = await computePosition(reference, floating, {
      ...positioning,
      platform: {
        ...domPlatform,
        setVariables: (_element, variables) => {
          if (current()) {
            writeVariables(variables);
          }
        },
      },
      // Floating UI's own computation for the DOM keeps the caches its platform reads.
      compute: computeDomPosition,
    });
    if (!current()) {
      return;
    }
    write('transform', `translate(${round(result.x)}px, ${round(result.y)}px)`);
    writeVariables(result.variables);
    if (result.placement !== placement) {
      placement = result.placement;
      floating.dataset['placement'] = placement;
      onPlacementChange?.(placement);
    }
  };

  const stopUpdates = autoUpdate(reference, floating, () => {
    void update();
  });
  return () => {
    if (!stopped) {
      stopped = true;
      stopUpdates();
    }
  };
}
