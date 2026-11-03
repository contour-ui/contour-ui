import type { RangeActionsOptions } from '../shared/services.ts';
import type { ServiceResult } from './types.ts';

/** No props and no node: the same object on every call. */
const NO_ACTIONS: ServiceResult = Object.freeze({ props: Object.freeze({}), ref: undefined });

/**
 * The actions assistive technology takes on an adjustable element (see `RangeActionsOptions`):
 * nothing to declare on the web, where screen readers send the keys of a slider, which the part
 * handles itself. A plain function, so a server may run it; it returns the same empty result on
 * every call.
 *
 * @example
 * const actions = useRangeActions({ disabled: disabled || readOnly, onStep, onSetValue });
 * <Primitive.svg {...mergeProps(actions.props, ownProps, props)} />
 */
export function useRangeActions(_options: RangeActionsOptions): ServiceResult {
  return NO_ACTIONS;
}
