'use client';

import { createContext, use } from 'react';
import type { Context } from 'react';

import type { UsePresenceReturn } from '../presence/index.ts';
import type { UseCollapsibleReturn } from './use-collapsible.ts';

/** What `Collapsible.Root` gives its parts: the collapsible API, and how its content shows and hides. */
export interface CollapsibleContextValue extends UseCollapsibleReturn {
  /**
   * The presence of the content: whether it is mounted and shown, its `hidden` and `inert`, and
   * the ref of the content, whose exit animation it waits for.
   */
  readonly presence: UsePresenceReturn;
  /**
   * Whether the content started open and has not closed since: it renders with
   * `animation-name: none`, so that it shows at once instead of running its open animation.
   */
  readonly skipAnimation: boolean;
}

/** The API of the nearest `Collapsible.Root`, for its parts. */
export const CollapsibleContext: Context<CollapsibleContextValue | null> =
  createContext<CollapsibleContextValue | null>(null);

/**
 * The API of the nearest `Collapsible.Root`: `open`, `disabled`, `setOpen()`, `toggle()`, the
 * props of its elements, and the presence its content shows and hides with. For parts of your
 * own inside the root; throws outside of one.
 *
 * @example
 * function Summary(): ReactElement {
 *   const { open } = useCollapsibleContext();
 *   return <span>{open ? 'Hide' : 'Show'} details</span>;
 * }
 */
export function useCollapsibleContext(): CollapsibleContextValue {
  const api = use(CollapsibleContext);
  if (api === null) {
    throw new Error('Collapsible: render the parts inside <Collapsible.Root>.');
  }
  return api;
}
