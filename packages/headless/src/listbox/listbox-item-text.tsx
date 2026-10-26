import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useListboxContext, useListboxItemContext } from './listbox-context.ts';

export type ListboxItemTextProps = PrimitiveProps<'span'>;

/**
 * Listbox item text: a `span` with the text of its `Listbox.Item`, carrying the state of the
 * item for styles.
 *
 * @example
 * <Listbox.ItemText>{item.label}</Listbox.ItemText>
 */
export function ListboxItemText(props: ListboxItemTextProps): ReactElement {
  const api = useListboxContext();
  const { item } = useListboxItemContext();
  return <Primitive.span {...mergeProps(api.getItemTextProps({ item }), props)} />;
}
