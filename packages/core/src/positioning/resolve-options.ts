import type { PositioningOptions, ResolvedPositioningOptions } from './positioning.types.ts';

/** What positioning does when an option is left out. */
const DEFAULTS: ResolvedPositioningOptions = {
  placement: 'bottom',
  offset: 0,
  flip: true,
  shift: 0,
  sameWidth: false,
  fitViewport: false,
  strategy: 'absolute',
};

/**
 * The positioning options with every default filled in. Pass several sets to layer them: a later
 * set wins, and an option it leaves out (or sets to `undefined`) keeps the earlier value. This is
 * how a component puts the owner's options over its own defaults.
 *
 * @example
 * const options = resolvePositioningOptions(
 *   { placement: 'bottom-start', offset: 8, shift: 8, fitViewport: true },
 *   props.positioning,
 * );
 */
export function resolvePositioningOptions(
  ...layers: ReadonlyArray<PositioningOptions | undefined>
): ResolvedPositioningOptions {
  let { placement, offset, flip, shift, sameWidth, fitViewport, strategy } = DEFAULTS;
  for (const layer of layers) {
    placement = layer?.placement ?? placement;
    offset = layer?.offset ?? offset;
    flip = layer?.flip ?? flip;
    shift = layer?.shift ?? shift;
    sameWidth = layer?.sameWidth ?? sameWidth;
    fitViewport = layer?.fitViewport ?? fitViewport;
    strategy = layer?.strategy ?? strategy;
  }
  return { placement, offset, flip, shift, sameWidth, fitViewport, strategy };
}
