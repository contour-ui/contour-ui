/*
 * The Soundor build of headless-react: the components that run in Soundor plugin UIs, from the
 * same sources as on the web. The web build (`index.ts`) exports every component.
 */

// The elements parts are made of, for parts of one's own: from the element layer, re-exported
// so that apps that build parts need no other package.
export { composeRefs, mergeProps, Primitive, useComposedRefs } from '@contour-ui/primitive';
export type { PrimitiveElement, PrimitiveProps } from '@contour-ui/primitive';

export * as Knob from './knob/index.ts';
export { useKnobContext } from './knob/knob-context.ts';
export { useKnob } from './knob/use-knob.ts';
export type {
  KnobArcAttributes,
  KnobControlAttributes,
  KnobHiddenInputAttributes,
  KnobLabelAttributes,
  KnobPartAttributes,
  KnobRootAttributes,
  KnobRootStyle,
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
