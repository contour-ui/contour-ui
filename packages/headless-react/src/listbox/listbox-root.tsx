'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { ListboxContext } from './listbox-context.ts';
import { useListbox } from './use-listbox.ts';
import type { UseListboxProps, UseListboxReturn } from './use-listbox.ts';

export interface ListboxRootProps<T = unknown>
  extends UseListboxProps<T>, Omit<PrimitiveProps<'div'>, keyof UseListboxProps<T>> {}

/**
 * Listbox root: a `div` that runs the listbox machine and gives its parts the state. It holds
 * the label, the input, the list and the empty state. `collection` is the only prop it needs:
 * the items, from `createListCollection`.
 *
 * @example
 * <Listbox.Root collection={collection}>
 *   <Listbox.Label>Instrument</Listbox.Label>
 *   <Listbox.Content>
 *     {collection.items.map((item) => (
 *       <Listbox.Item key={item.value} item={item}>
 *         <Listbox.ItemText>{item.label}</Listbox.ItemText>
 *         <Listbox.ItemIndicator>✓</Listbox.ItemIndicator>
 *       </Listbox.Item>
 *     ))}
 *   </Listbox.Content>
 * </Listbox.Root>
 */
export function ListboxRoot<T>({
  collection,
  value,
  defaultValue,
  onValueChange,
  highlightedValue,
  defaultHighlightedValue,
  onHighlightChange,
  onSelect,
  selectionMode,
  deselectable,
  selectOnHighlight,
  loopFocus,
  typeahead,
  highlightOnHover,
  autoHighlight,
  disabled,
  orientation,
  ...props
}: ListboxRootProps<T>): ReactElement {
  const api = useListbox<T>({
    collection,
    value,
    defaultValue,
    onValueChange,
    highlightedValue,
    defaultHighlightedValue,
    onHighlightChange,
    onSelect,
    selectionMode,
    deselectable,
    selectOnHighlight,
    loopFocus,
    typeahead,
    highlightOnHover,
    autoHighlight,
    disabled,
    orientation,
  });
  // The parts take items as `unknown`: each one gets its item back from the collection.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const context = api as UseListboxReturn;
  return (
    <ListboxContext value={context}>
      <Primitive.div {...mergeProps(api.getRootProps(), props)} />
    </ListboxContext>
  );
}
