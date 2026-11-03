/*
 * The Soundor build of the element layer: `@soundor/react` nodes, the web vocabulary translated
 * into Soundor's own props, and the services of the Soundor runtime.
 */

/** The platform of this build. */
export const PLATFORM: 'web' | 'soundor' = 'soundor';

export * from '../shared/index.ts';
export { customProperties } from './custom-properties.ts';
export type { CustomPropertiesProps } from './custom-properties.ts';
export { mergeProps } from './merge-props.ts';
export type { MergedProps } from './merge-props.ts';
export { resolveStyle } from './part-style.ts';
export type { PartStyle } from './part-style.ts';
export { Primitive } from './primitive.ts';
export type {
  InteractionResult,
  PrimitiveComponent,
  PrimitiveComponents,
  PrimitiveElement,
  PrimitiveFocusEvent,
  PrimitiveKeyboardEvent,
  PrimitiveNode,
  PrimitivePointerEvent,
  PrimitivePressEvent,
  PrimitiveProps,
  ServiceProps,
  ServiceResult,
  StyleStateProps,
} from './types.ts';
export { registerFont } from './register-font.ts';
export type { FontDescriptors } from './register-font.ts';
export { useDrag } from './use-drag.ts';
export { useInteraction } from './use-interaction.ts';
export { useRangeActions } from './use-range-actions.ts';
export { useStyleState } from './use-style-state.ts';
export { useWheel } from './use-wheel.ts';
