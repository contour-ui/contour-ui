'use client';

import { createContext, use } from 'react';
import type { Context } from 'react';

import type { UsePresenceReturn } from '../presence/index.ts';
import type { UsePopoverReturn } from './use-popover.ts';

/** What `Popover.Root` gives its parts: the popover API, and how its content shows and hides. */
export interface PopoverContextValue extends UsePopoverReturn {
  /**
   * The presence of the positioner and the content: whether they are mounted and shown, their
   * `hidden` and `inert`, and the ref of the content, whose exit animation it waits for.
   */
  readonly presence: UsePresenceReturn;
  /** Whether the positioner and the content mount only once the popover first opens. */
  readonly lazyMount: boolean;
  /** Whether the positioner and the content unmount once the popover has closed. */
  readonly unmountOnExit: boolean;
}

/** The API of the nearest `Popover.Root`, for its parts. */
export const PopoverContext: Context<PopoverContextValue | null> =
  createContext<PopoverContextValue | null>(null);

/**
 * The API of the nearest `Popover.Root`: `open`, `modal`, `portalled`, `placement`, `setOpen()`,
 * `toggle()`, the props of its elements, and the presence its content shows and hides with. For
 * parts of your own inside the root; throws outside of one.
 *
 * @example
 * function DoneButton(): ReactElement {
 *   const { setOpen } = usePopoverContext();
 *   return (
 *     <button type="button" onClick={() => setOpen(false)}>
 *       Done
 *     </button>
 *   );
 * }
 */
export function usePopoverContext(): PopoverContextValue {
  const api = use(PopoverContext);
  if (api === null) {
    throw new Error('Popover: render the parts inside <Popover.Root>.');
  }
  return api;
}
