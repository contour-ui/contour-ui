'use client';

import { useCallback, useInsertionEffect, useRef } from 'react';
import type { RefCallback } from 'react';

import type { WheelOptions } from '../shared/services.ts';
import type { ServiceProps, ServiceResult } from './types.ts';

/** The wheel service passes no React props: its listener needs the node. */
const NO_PROPS: ServiceProps = Object.freeze({});

/** Whether an event of the `wheel` listener is a wheel event, in any window. */
const isWheelEvent = (event: Event): event is WheelEvent => 'deltaY' in event;

/**
 * The wheel over an element on the DOM (see `WheelOptions`): a native `wheel` listener with
 * `{ passive: false }`, added in a ref callback, since React's `onWheel` listens passively and
 * cannot keep the page from scrolling. While not `disabled`, it prevents the default and hands
 * `onWheel` the turn; while `disabled`, or when another listener prevented the default first,
 * the wheel scrolls what is around the element.
 *
 * Compose `ref` with the element's other refs (`useComposedRefs`); `props` is empty.
 *
 * @example
 * const wheel = useWheel({
 *   disabled: disabled || readOnly,
 *   onWheel: (turn) => { api.scrollWheel(getRangeWheelDelta(turn), turn.shiftKey); },
 * });
 * <Primitive.svg ref={useComposedRefs<PrimitiveNode<'svg'>>(wheel.ref, ref)} />
 */
export function useWheel(options: WheelOptions): ServiceResult {
  const latest = useRef(options);
  useInsertionEffect(() => {
    latest.current = options;
  });
  const ref = useCallback<RefCallback<Element>>((element) => {
    if (element === null) {
      return undefined;
    }
    const listener = (event: Event): void => {
      if (latest.current.disabled || event.defaultPrevented || !isWheelEvent(event)) {
        return;
      }
      event.preventDefault();
      const { deltaX, deltaY, deltaMode, shiftKey } = event;
      latest.current.onWheel({ deltaX, deltaY, deltaMode, shiftKey });
    };
    element.addEventListener('wheel', listener, { passive: false });
    return () => {
      element.removeEventListener('wheel', listener);
    };
  }, []);
  return { props: NO_PROPS, ref };
}
