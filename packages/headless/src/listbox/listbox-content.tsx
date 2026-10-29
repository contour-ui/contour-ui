'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useListboxContext } from './listbox-context.ts';

export type ListboxContentProps = PrimitiveProps<'div'>;

/**
 * Listbox content: the `div` with the `listbox` role that holds the items and their groups. It
 * takes the keys while it has focus: the arrows, Home and End move the highlight, typed letters
 * find an item, Enter and Space select. The highlighted item scrolls into view inside it, never
 * the page.
 *
 * @example
 * <Listbox.Content>
 *   <Listbox.Item item={item}>…</Listbox.Item>
 * </Listbox.Content>
 */
export function ListboxContent({ ref, ...props }: ListboxContentProps): ReactElement {
  const api = useListboxContext();
  const ownProps = api.getContentProps();
  const composedRef = useComposedRefs<HTMLDivElement>(ownProps.ref, ref);
  return <Primitive.div {...mergeProps(ownProps, props)} ref={composedRef} />;
}
