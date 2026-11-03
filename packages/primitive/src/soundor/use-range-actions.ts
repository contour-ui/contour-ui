import type { AccessibilityActionInfo } from '@soundor/react';
import type { AccessibilityActionEvent } from 'soundor:ui';
import { useInsertionEffect, useState } from 'react';

import type { RangeActionsOptions } from '../shared/services.ts';
import type { ServiceResult } from './types.ts';

/** What assistive technology may do to an adjustable element that can change. */
const ACTIONS: readonly AccessibilityActionInfo[] = Object.freeze([
  { name: 'increment' },
  { name: 'decrement' },
  { name: 'setValue' },
]);

/**
 * None, given explicitly: an element that cannot change offers nothing, and the runtime would
 * keep the actions of the props before.
 */
const NO_ACTIONS: readonly AccessibilityActionInfo[] = Object.freeze([]);

/** The value of a `setValue` action: a number, or a numeric text; `undefined` for anything else. */
function numberOf(value: number | string | undefined): number | undefined {
  const next = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof next === 'number' && Number.isFinite(next) ? next : undefined;
}

/** The range actions of one element: its props while it can change, and while it cannot. */
interface RangeActionsController {
  readonly enabled: ServiceResult;
  readonly disabled: ServiceResult;
  readonly setOptions: (options: RangeActionsOptions) => void;
}

function createRangeActions(initial: RangeActionsOptions): RangeActionsController {
  let options = initial;
  const onAccessibilityAction = (event: AccessibilityActionEvent): void => {
    if (event.defaultPrevented || options.disabled) {
      return;
    }
    const { actionName } = event;
    if (actionName === 'increment' || actionName === 'decrement') {
      options.onStep(actionName === 'increment' ? 1 : -1);
    } else if (actionName === 'setValue') {
      const value = numberOf(event.value);
      if (value === undefined) {
        // Not a number: the runtime's own response goes on.
        return;
      }
      options.onSetValue(value);
    } else {
      return;
    }
    // Done: the runtime's own response does not follow.
    event.preventDefault();
  };
  return {
    enabled: { props: { accessibilityActions: ACTIONS, onAccessibilityAction }, ref: undefined },
    disabled: {
      props: { accessibilityActions: NO_ACTIONS, onAccessibilityAction },
      ref: undefined,
    },
    setOptions: (next) => {
      options = next;
    },
  };
}

/**
 * The actions assistive technology takes on an adjustable element on Soundor (see
 * `RangeActionsOptions`): `increment` and `decrement` step the value, `setValue` sets the number
 * it gives (a number, or a numeric text). A handled action is prevented, so the runtime's own
 * response does not follow; any other action, or a value that is no number, goes on to it. While
 * `disabled`, no action is offered.
 *
 * @example
 * const actions = useRangeActions({
 *   disabled: disabled || readOnly,
 *   onStep: (direction) => { api.stepValue(direction, 'step'); },
 *   onSetValue: (value) => { api.commitValue(value); },
 * });
 * <Primitive.svg role="slider" {...mergeProps(actions.props, ownProps, props)} />
 */
export function useRangeActions(options: RangeActionsOptions): ServiceResult {
  const [controller] = useState(() => createRangeActions(options));
  useInsertionEffect(() => {
    controller.setOptions(options);
  });
  return options.disabled ? controller.disabled : controller.enabled;
}
