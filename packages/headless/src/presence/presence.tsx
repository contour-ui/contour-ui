'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { usePresence } from './use-presence.ts';
import type { UsePresenceProps } from './use-presence.ts';

/** Props of {@link Presence}: those of {@link usePresence}, and the props of its `div`. */
export interface PresenceProps
  extends UsePresenceProps, Omit<PrimitiveProps<'div'>, keyof UsePresenceProps> {}

/**
 * Presence: a `div` that shows while `present`, and keeps showing through its exit animation
 * once `present` turns `false`. It carries `data-state="open"` or `"closed"`, for the CSS
 * animations of each state, then `hidden` once closed, or unmounts with `unmountOnExit`; with
 * `lazyMount`, it mounts only once `present` is first `true`. See {@link usePresence} for how
 * it tells an exit animation.
 *
 * @example
 * <>
 *   <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
 *     Shipping
 *   </button>
 *   <Presence present={open} unmountOnExit className="details">
 *     Ships in two days.
 *   </Presence>
 * </>;
 * // .details[data-state='open'] { animation: details-in 200ms; }
 * // .details[data-state='closed'] { animation: details-out 150ms; }
 */
export function Presence({
  present,
  lazyMount,
  unmountOnExit,
  onExitComplete,
  ref,
  ...props
}: PresenceProps): ReactElement | null {
  const presence = usePresence({ present, lazyMount, unmountOnExit, onExitComplete });
  const composedRef = useComposedRefs<HTMLDivElement>(presence.ref, ref);
  if (!presence.mounted) {
    return null;
  }
  const ownProps = {
    'data-scope': 'presence',
    'data-part': 'root',
    'data-state': present ? 'open' : 'closed',
    ...presence.getPresenceProps(),
  };
  return <Primitive.div {...mergeProps(ownProps, props)} ref={composedRef} />;
}
