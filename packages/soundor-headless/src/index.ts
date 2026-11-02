/**
 * contour-ui for Soundor plugin UIs, unstyled: the machines of `@contour-ui/core` on the
 * primitives of `@soundor/react`, with their input, focus and accessibility.
 */
export * as Knob from './knob/index.ts';
export { useKnobContext } from './knob/knob-context.ts';
export { useKnob } from './knob/use-knob.ts';
export type {
  KnobArcAttributes,
  KnobControlAttributes,
  KnobLabelAttributes,
  KnobShapeAttributes,
  KnobThumbAttributes,
  KnobValueTextAttributes,
  UseKnobProps,
  UseKnobReturn,
} from './knob/use-knob.ts';
// The readouts and scales of value controls come from core: re-exported for apps that use only
// this package.
export {
  formatDecibels,
  formatDuration,
  formatFrequency,
  formatNumber,
  formatPercent,
  linearScale,
  logScale,
  powerScale,
} from '@contour-ui/core';
export type { Scale, ScaleOption } from '@contour-ui/core';
