'use client';

import type { listbox } from '@contour-ui/core';
import { createContext, use } from 'react';
import type { Context, RefCallback } from 'react';

import type { UseListboxReturn } from './use-listbox.ts';

/** The API of the nearest `Listbox.Root`, for its parts. */
export const ListboxContext: Context<UseListboxReturn | null> =
  createContext<UseListboxReturn | null>(null);

/**
 * The API of the nearest `Listbox.Root`: the collection, the selection, the highlight, functions
 * such as `selectValue` and `highlightNext`, and the props of its elements. For parts of your own
 * inside the root; throws outside of one. Its items are `unknown`: cast them to your type.
 *
 * @example
 * function SelectionCount(): ReactElement {
 *   const { value } = useListboxContext();
 *   return <p>{`${value.length} selected`}</p>;
 * }
 */
export function useListboxContext(): UseListboxReturn {
  const api = use(ListboxContext);
  if (api === null) {
    throw new Error('Listbox: render the parts inside <Listbox.Root>.');
  }
  return api;
}

/** What `Listbox.Item` gives its parts. */
export interface ListboxItemContextValue {
  /** The item of the collection. */
  readonly item: unknown;
  /** Its state: value, selected, highlighted, disabled. */
  readonly state: listbox.ItemState;
}

/** The item of the nearest `Listbox.Item`, for its parts. */
export const ListboxItemContext: Context<ListboxItemContextValue | null> =
  createContext<ListboxItemContextValue | null>(null);

/**
 * The item of the nearest `Listbox.Item` and its state, for parts of your own inside the item;
 * throws outside of one.
 *
 * @example
 * function Shortcut(): ReactElement | null {
 *   const { state } = useListboxItemContext();
 *   return state.highlighted ? <kbd>Enter</kbd> : null;
 * }
 */
export function useListboxItemContext(): ListboxItemContextValue {
  const item = use(ListboxItemContext);
  if (item === null) {
    throw new Error('Listbox: render the parts of an item inside <Listbox.Item>.');
  }
  return item;
}

/** What `Listbox.ItemGroup` gives its label. */
export interface ListboxItemGroupContextValue {
  /** The id of the label of the group. */
  readonly labelId: string;
  /** Tells the group that its label is mounted, so the group points to it. */
  readonly labelRef: RefCallback<HTMLElement>;
}

/** The group of the nearest `Listbox.ItemGroup`, for its label. */
export const ListboxItemGroupContext: Context<ListboxItemGroupContextValue | null> =
  createContext<ListboxItemGroupContextValue | null>(null);

/** The group of the nearest `Listbox.ItemGroup`; throws outside of one. */
export function useListboxItemGroupContext(): ListboxItemGroupContextValue {
  const group = use(ListboxItemGroupContext);
  if (group === null) {
    throw new Error('Listbox: render Listbox.ItemGroupLabel inside <Listbox.ItemGroup>.');
  }
  return group;
}
