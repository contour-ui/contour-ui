/*
 * What both builds export from the shared code: the vocabulary, the compatibility table, the
 * contracts of the services, the interaction state and the helpers every platform has. Each
 * backend's entry re-exports this module next to its own elements and services.
 */
export { ARIA_ATTRIBUTES, ROLES, SHARED_EVENTS } from './compat.ts';
export type {
  AriaAttribute,
  AriaKinds,
  AriaNativeKind,
  AriaValueKind,
  ElementRole,
  ElementRoles,
  NativeRole,
  RoleTwins,
  SharedAriaAttribute,
  SharedAriaProps,
  SharedEvent,
  SharedRole,
} from './compat.ts';
export { composeRefs, useComposedRefs } from './compose-refs.ts';
export { SHARED_ELEMENTS } from './elements.ts';
export type { ShapeElement, SharedElement, WebOnlyElement } from './elements.ts';
export { createInteractionStore, RESTING_INTERACTION } from './interaction.ts';
export type {
  InteractionState,
  InteractionStore,
  WritableInteractionStore,
} from './interaction.ts';
export type {
  NativeCursor,
  NativeDimension,
  NativeFlexAlign,
  NativeLength,
  NativeStyle,
} from './native-style.ts';
export type {
  DragEndReason,
  DragMove,
  DragOptions,
  InteractionOptions,
  RangeActionsOptions,
  StyleStateOptions,
  StyleStateResult,
  WheelOptions,
  WheelTurn,
} from './services.ts';
export { useInteractionField } from './use-interaction-field.ts';
