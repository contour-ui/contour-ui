import {
  computePosition as computeCoordinates,
  flip as flipMiddleware,
  limitShift,
  offset as offsetMiddleware,
  shift as shiftMiddleware,
  size as sizeMiddleware,
} from '@floating-ui/core';
import type {
  ComputePositionConfig as FloatingConfig,
  Dimensions,
  Middleware,
  Platform,
} from '@floating-ui/core';

import type {
  ComputePositionConfig,
  PositioningResult,
  PositioningSizeVariables,
} from './positioning.types.ts';
import { resolvePositioningOptions } from './resolve-options.ts';
import { getTransformOrigin } from './transform-origin.ts';

/** A length in CSS pixels. */
function px(value: number): string {
  return `${value}px`;
}

/** The variables that size the floating element, from the reference and the room around it. */
function sizeVariables(reference: Dimensions, room: Dimensions): PositioningSizeVariables {
  return {
    '--reference-width': px(reference.width),
    '--reference-height': px(reference.height),
    '--available-width': px(room.width),
    '--available-height': px(room.height),
  };
}

/**
 * Compute where a floating element goes next to its reference: the options become Floating UI
 * middleware (`offset`, `flip`, `shift` with `limitShift`, `size`), and Floating UI computes the
 * position with the platform the adapter passes: through `compute` when the adapter gives one,
 * through `@floating-ui/core` otherwise. The elements are whatever that platform measures: DOM
 * elements, Soundor nodes, rectangles in tests.
 *
 * The floating element is placed with the size the options give it: as wide as the reference
 * with `sameWidth`, capped by the room it has with `fitViewport`. The adapter applies that size
 * (the DOM through the variables), and `platform.setVariables`, when given, lets it apply the
 * size during the computation, so that a new measurement sees its effects.
 *
 * Returns plain data: the coordinates (not rounded), the placement after `flip`, the sizes, the
 * transform origin and the same values as CSS custom properties. The adapter writes them.
 *
 * @example
 * const result = await computePosition(trigger, positioner, {
 *   placement: 'bottom-start',
 *   offset: 8,
 *   platform,
 * });
 * result.placement; // 'top-start' when there is no room below
 * result.variables['--available-height']; // '312px'
 */
export async function computePosition(
  reference: unknown,
  floating: unknown,
  config: ComputePositionConfig,
): Promise<PositioningResult> {
  const { platform } = config;
  const options = resolvePositioningOptions(config);
  const padding = typeof options.shift === 'number' ? options.shift : 0;

  // What the size middleware found last: the size of the reference and the room around the
  // floating element. No room is known until it runs, so nothing is capped before.
  let referenceSize: Dimensions = { width: 0, height: 0 };
  let room: Dimensions | undefined;

  /** The size the floating element takes once the adapter applies `sameWidth` and `fitViewport`. */
  const fit = (measured: Dimensions): Dimensions => {
    const width = options.sameWidth ? referenceSize.width : measured.width;
    if (!options.fitViewport || room === undefined) {
      return { width, height: measured.height };
    }
    return { width: Math.min(width, room.width), height: Math.min(measured.height, room.height) };
  };

  // The adapter's platform, measuring the floating element at that size. `size` measures it
  // again after its `apply`: when the room changed its size, the computation starts over with
  // the new size, as Floating UI does when `apply` changes the styles of an element.
  const measure: Platform = {
    ...platform,
    getElementRects: async (args) => {
      const rects = await platform.getElementRects(args);
      referenceSize = { width: rects.reference.width, height: rects.reference.height };
      return {
        reference: rects.reference,
        floating: { ...rects.floating, ...fit(rects.floating) },
      };
    },
    getDimensions: async (element) => {
      const dimensions = await platform.getDimensions(element);
      return element === floating ? fit(dimensions) : dimensions;
    },
  };

  const flip: Middleware | undefined =
    options.flip === false
      ? undefined
      : flipMiddleware({
          padding,
          // Room across the side does not move the floating element to the other axis: shift
          // handles it. Room along the side does, when a list asks for that axis.
          crossAxis: 'alignment',
          fallbackPlacements: options.flip === true ? undefined : [...options.flip],
        });
  const shift: Middleware | undefined =
    options.shift === false ? undefined : shiftMiddleware({ padding, limiter: limitShift() });
  const size: Middleware = sizeMiddleware({
    padding,
    apply: ({ rects, availableWidth, availableHeight }) => {
      room = {
        width: Math.max(0, Math.floor(availableWidth)),
        height: Math.max(0, Math.floor(availableHeight)),
      };
      platform.setVariables?.(floating, sizeVariables(rects.reference, room));
    },
  });

  const floatingConfig: FloatingConfig = {
    placement: options.placement,
    strategy: options.strategy,
    // An aligned placement tries the other alignment before it slides; a centered one slides
    // first, so that flip only weighs the room along its side.
    middleware: [
      offsetMiddleware(options.offset),
      ...(options.placement.includes('-') ? [flip, shift] : [shift, flip]),
      size,
    ],
    platform: measure,
  };
  const result = await (config.compute?.(reference, floating, floatingConfig) ??
    computeCoordinates(reference, floating, floatingConfig));

  const available = room ?? { width: 0, height: 0 };
  const rtl = (await platform.isRTL?.(floating)) ?? false;
  const transformOrigin = getTransformOrigin(result.placement, rtl);
  return {
    x: result.x,
    y: result.y,
    placement: result.placement,
    strategy: result.strategy,
    referenceWidth: referenceSize.width,
    referenceHeight: referenceSize.height,
    availableWidth: available.width,
    availableHeight: available.height,
    transformOrigin,
    variables: {
      ...sizeVariables(referenceSize, available),
      '--transform-origin': transformOrigin,
    },
  };
}
