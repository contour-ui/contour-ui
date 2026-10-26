import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useListboxContext } from './listbox-context.ts';

export type ListboxInputProps = PrimitiveProps<'input'>;

/**
 * Listbox input: a text field that keeps the focus while ↓ and ↑ move the highlight in the list
 * (`aria-activedescendant`) and Enter selects the highlighted item. Home, End, ← and → move the
 * caret, as in any text field. It filters nothing itself: use its value to build the collection,
 * as a search box does.
 *
 * It has the `combobox` role, as the field of a command palette: a field that controls a list of
 * options (`aria-controls`). Screen readers announce it with its options, and the list, which
 * the keys of the field scroll, needs no focus of its own. The list is shown with the field, so
 * the field is always expanded (`aria-expanded`): pass `aria-expanded={false}` while you hide the
 * list.
 *
 * @example
 * <Listbox.Input
 *   aria-label="Search"
 *   value={query}
 *   onChange={(event) => setQuery(event.target.value)}
 * />
 */
export function ListboxInput({ ref, ...props }: ListboxInputProps): ReactElement {
  const api = useListboxContext();
  const ownProps = api.getInputProps();
  const composedRef = useComposedRefs(ownProps.ref, ref);
  return <Primitive.input {...mergeProps(ownProps, props)} ref={composedRef} />;
}
