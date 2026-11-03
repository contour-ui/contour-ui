'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '@contour-ui/primitive';
import type { PrimitiveProps } from '@contour-ui/primitive';
import { useListboxContext, useListboxItemContext } from './listbox-context.ts';

export type ListboxItemIndicatorProps = PrimitiveProps<'span'>;

/**
 * Listbox item indicator: a `span` that marks a selected item, such as with a check mark. It is
 * `hidden` while its item is not selected, and always hidden from assistive technology: the
 * option itself is announced as selected.
 *
 * @example
 * <Listbox.ItemIndicator>✓</Listbox.ItemIndicator>
 */
export function ListboxItemIndicator(props: ListboxItemIndicatorProps): ReactElement {
  const api = useListboxContext();
  const { item } = useListboxItemContext();
  return <Primitive.span {...mergeProps(api.getItemIndicatorProps({ item }), props)} />;
}
