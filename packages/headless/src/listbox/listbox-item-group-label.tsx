import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useListboxContext, useListboxItemGroupContext } from './listbox-context.ts';

export type ListboxItemGroupLabelProps = PrimitiveProps<'div'>;

/**
 * Listbox item group label: a `div` that names its `Listbox.ItemGroup` (`aria-labelledby`).
 * Screen readers announce it when the highlight enters the group.
 *
 * @example
 * <Listbox.ItemGroupLabel>Strings</Listbox.ItemGroupLabel>
 */
export function ListboxItemGroupLabel({ ref, ...props }: ListboxItemGroupLabelProps): ReactElement {
  const api = useListboxContext();
  const group = useListboxItemGroupContext();
  const composedRef = useComposedRefs<HTMLDivElement>(group.labelRef, ref);
  return (
    <Primitive.div
      {...mergeProps(api.getItemGroupLabelProps({ id: group.labelId }), props)}
      ref={composedRef}
    />
  );
}
