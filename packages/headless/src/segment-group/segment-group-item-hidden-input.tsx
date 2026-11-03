'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '@contour-ui/primitive';
import type { PrimitiveProps } from '@contour-ui/primitive';
import { useSegmentGroupContext, useSegmentGroupItemContext } from './segment-group-context.ts';

export type SegmentGroupItemHiddenInputProps = PrimitiveProps<'input'>;

/**
 * Segment group item hidden input: the native radio button of the item, out of sight but in the
 * accessibility tree. It takes focus, gives the keyboard (Tab to the checked item, arrow keys to
 * move the check) and submits the value with its form. Put it inside `SegmentGroup.Item`; when
 * the item shows only an icon, name it with `aria-label`.
 *
 * @example
 * <SegmentGroup.ItemHiddenInput aria-label="Dark theme" />
 */
export function SegmentGroupItemHiddenInput(props: SegmentGroupItemHiddenInputProps): ReactElement {
  const api = useSegmentGroupContext();
  const { item } = useSegmentGroupItemContext();
  return <Primitive.input {...mergeProps(api.getItemHiddenInputProps(item), props)} />;
}
