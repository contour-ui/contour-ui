'use client';

import type { segmentGroup } from '@contour-ui/core';
import { createContext, use } from 'react';
import type { Context } from 'react';

import type { UseSegmentGroupReturn } from './use-segment-group.ts';

/** The API of the nearest `SegmentGroup.Root`, for its parts. */
export const SegmentGroupContext: Context<UseSegmentGroupReturn | null> =
  createContext<UseSegmentGroupReturn | null>(null);

/**
 * The API of the nearest `SegmentGroup.Root`: the value, `setValue()`, the state of each item and
 * the props of its elements. For parts of your own inside the root; throws outside of one.
 *
 * @example
 * function Summary(): ReactElement {
 *   const { value } = useSegmentGroupContext();
 *   return <p>{`Showing: ${value ?? 'nothing'}`}</p>;
 * }
 */
export function useSegmentGroupContext(): UseSegmentGroupReturn {
  const api = use(SegmentGroupContext);
  if (api === null) {
    throw new Error('SegmentGroup: render the parts inside <SegmentGroup.Root>.');
  }
  return api;
}

/** What `SegmentGroup.Item` gives its parts. */
export interface SegmentGroupItemContextValue {
  /** The props of the item: its value, and whether it is disabled. */
  readonly item: segmentGroup.ItemProps;
  /** Its state: checked, disabled, focused, focus-visible. */
  readonly state: segmentGroup.ItemState;
}

/** The item of the nearest `SegmentGroup.Item`, for its parts. */
export const SegmentGroupItemContext: Context<SegmentGroupItemContextValue | null> =
  createContext<SegmentGroupItemContextValue | null>(null);

/**
 * The item of the nearest `SegmentGroup.Item` and its state, for parts of your own inside the
 * item; throws outside of one.
 *
 * @example
 * function Check(): ReactElement | null {
 *   const { state } = useSegmentGroupItemContext();
 *   return state.checked ? <CheckIcon aria-hidden /> : null;
 * }
 */
export function useSegmentGroupItemContext(): SegmentGroupItemContextValue {
  const item = use(SegmentGroupItemContext);
  if (item === null) {
    throw new Error('SegmentGroup: render the parts of an item inside <SegmentGroup.Item>.');
  }
  return item;
}
