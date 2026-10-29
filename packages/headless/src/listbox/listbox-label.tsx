'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useListboxContext } from './listbox-context.ts';

export type ListboxLabelProps = PrimitiveProps<'label'>;

/**
 * Listbox label: a `label` that names the list (`aria-labelledby`) and, when there is one, the
 * input (`for`): a click on it focuses the input.
 *
 * @example
 * <Listbox.Label>Instrument</Listbox.Label>
 */
export function ListboxLabel({ ref, ...props }: ListboxLabelProps): ReactElement {
  const api = useListboxContext();
  const ownProps = api.getLabelProps();
  const composedRef = useComposedRefs(ownProps.ref, ref);
  return <Primitive.label {...mergeProps(ownProps, props)} ref={composedRef} />;
}
