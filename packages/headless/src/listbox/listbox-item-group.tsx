'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import type { ReactElement, RefCallback } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { ListboxItemGroupContext, useListboxContext } from './listbox-context.ts';
import type { ListboxItemGroupContextValue } from './listbox-context.ts';

export type ListboxItemGroupProps = PrimitiveProps<'div'>;

/**
 * Listbox item group: a `div` with the `group` role around items that belong together, named
 * by its `Listbox.ItemGroupLabel`. Render the groups of the collection (`collection.groups`), so
 * that the keys go through the items in the order they are shown.
 *
 * @example
 * {collection.groups.map((group) => (
 *   <Listbox.ItemGroup key={group.key}>
 *     <Listbox.ItemGroupLabel>{group.key}</Listbox.ItemGroupLabel>
 *     {group.items.map((item) => (
 *       <Listbox.Item key={item.value} item={item}>…</Listbox.Item>
 *     ))}
 *   </Listbox.ItemGroup>
 * ))}
 */
export function ListboxItemGroup(props: ListboxItemGroupProps): ReactElement {
  const api = useListboxContext();
  const generatedId = useId();
  // The id of the mounted label: the generated one, or the owner's.
  const [labelledBy, setLabelledBy] = useState<string | undefined>(undefined);
  const labelRef = useCallback<RefCallback<HTMLElement>>((element) => {
    if (element === null) {
      return undefined;
    }
    setLabelledBy(element.id);
    return () => {
      setLabelledBy(undefined);
    };
  }, []);
  const group = useMemo<ListboxItemGroupContextValue>(
    () => ({ labelId: generatedId, labelRef }),
    [generatedId, labelRef],
  );
  return (
    <ListboxItemGroupContext value={group}>
      <Primitive.div {...mergeProps(api.getItemGroupProps({ labelId: labelledBy }), props)} />
    </ListboxItemGroupContext>
  );
}
