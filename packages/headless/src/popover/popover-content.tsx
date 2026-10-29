'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { usePopoverContext } from './popover-context.ts';

export type PopoverContentProps = PrimitiveProps<'div'>;

/**
 * Popover content: the `div` with the `dialog` role, inside `Popover.Positioner`. It is named by
 * `Popover.Title` and described by `Popover.Description` while they are mounted; without a
 * title, give it an `aria-label`. It carries `data-state` (`open` or `closed`) for its
 * animations, and `data-placement`, the side it ended up on. Once closed, it stays on screen,
 * `inert`, while its exit animation runs, then gets `hidden` (or unmounts with `unmountOnExit`).
 *
 * @example
 * <Popover.Content>
 *   <Popover.Title>Share this page</Popover.Title>
 * </Popover.Content>
 */
export function PopoverContent({ ref, ...props }: PopoverContentProps): ReactElement | null {
  const api = usePopoverContext();
  const { mounted, ref: presenceRef, getPresenceProps } = api.presence;
  const ownProps = api.getContentProps();
  const ownRef = useComposedRefs<HTMLDivElement>(presenceRef, ownProps.ref);
  const composedRef = useComposedRefs<HTMLDivElement>(ownRef, ref);
  if (!mounted) {
    return null;
  }
  return <Primitive.div {...mergeProps(ownProps, getPresenceProps(), props)} ref={composedRef} />;
}
