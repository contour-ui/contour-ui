'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { ListboxItemContext, useListboxContext } from './listbox-context.ts';

export interface ListboxItemProps extends PrimitiveProps<'div'> {
  /** The item of the collection this part shows. */
  item: unknown;
}

/**
 * Listbox item: a `div` with the `option` role for one item of the collection. A click selects
 * it, and with `highlightOnHover` (on by default) the pointer highlights it. It carries
 * `data-highlighted`, `data-selected` and `data-disabled`, and gives `Listbox.ItemText` and
 * `Listbox.ItemIndicator` its state.
 *
 * @example
 * <Listbox.Item item={item}>
 *   <Listbox.ItemText>{item.label}</Listbox.ItemText>
 *   <Listbox.ItemIndicator>✓</Listbox.ItemIndicator>
 * </Listbox.Item>
 */
export function ListboxItem({ item, ...props }: ListboxItemProps): ReactElement {
  const api = useListboxContext();
  const state = api.getItemState(item);
  return (
    <ListboxItemContext value={{ item, state }}>
      <Primitive.div {...mergeProps(api.getItemProps({ item }), props)} />
    </ListboxItemContext>
  );
}
