import { useInsertionEffect, useState } from 'react';

import type { WheelOptions } from '../shared/services.ts';
import type { ServiceResult } from './types.ts';

/** The wheel service of one element: its props, and the options they read. */
interface WheelController {
  readonly result: ServiceResult;
  readonly setOptions: (options: WheelOptions) => void;
}

function createWheel(initial: WheelOptions): WheelController {
  let options = initial;
  return {
    result: {
      props: {
        onWheel: (event) => {
          // The owner's handler runs first: `event.preventDefault()` there keeps the element
          // still. A disabled element leaves the wheel to the scroll view around it.
          if (event.defaultPrevented || options.disabled) {
            return;
          }
          // Handled: no scroll view scrolls.
          event.preventDefault();
          const { deltaX, deltaY, deltaMode, shiftKey } = event;
          options.onWheel({ deltaX, deltaY, deltaMode, shiftKey });
        },
      },
      ref: undefined,
    },
    setOptions: (next) => {
      options = next;
    },
  };
}

/**
 * The wheel over the element on Soundor (see `WheelOptions`): `onWheel`, a plain event there,
 * whose default is a scroll of the scroll view around the element. While not `disabled`, the
 * service prevents it and hands the turn over (`getRangeWheelDelta` of `@contour-ui/core` reads
 * it); while `disabled`, or when the owner's handler prevented the event, it does nothing.
 *
 * @example
 * const wheel = useWheel({
 *   disabled: disabled || readOnly,
 *   onWheel: (turn) => { api.scrollWheel(getRangeWheelDelta(turn), turn.shiftKey); },
 * });
 * <Primitive.svg {...mergeProps(wheel.props, ownProps, props)} />
 */
export function useWheel(options: WheelOptions): ServiceResult {
  const [controller] = useState(() => createWheel(options));
  useInsertionEffect(() => {
    controller.setOptions(options);
  });
  return controller.result;
}
