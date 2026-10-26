import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useListboxContext } from './listbox-context.ts';

export type ListboxEmptyProps = PrimitiveProps<'div'>;

/**
 * Listbox empty: a `div` that shows only while the collection has no items, such as "No
 * results" under a search box. Render it next to `Listbox.Content`, not inside: a list holds
 * only items and groups.
 *
 * @example
 * <Listbox.Empty>No results</Listbox.Empty>
 */
export function ListboxEmpty(props: ListboxEmptyProps): ReactElement | null {
  const api = useListboxContext();
  if (api.collection.size > 0) {
    return null;
  }
  return <Primitive.div {...mergeProps(api.getEmptyProps(), props)} />;
}
