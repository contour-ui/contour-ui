'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useSegmentGroupContext, useSegmentGroupItemContext } from './segment-group-context.ts';

export type SegmentGroupItemControlProps = PrimitiveProps<'span'>;

/**
 * Segment group item control: a `span` hidden from assistive technology, for what shows the
 * state of the item, such as a dot or an icon. It carries the state of the item.
 *
 * @example
 * <SegmentGroup.ItemControl />
 */
export function SegmentGroupItemControl(props: SegmentGroupItemControlProps): ReactElement {
  const api = useSegmentGroupContext();
  const { item } = useSegmentGroupItemContext();
  return <Primitive.span {...mergeProps(api.getItemControlProps(item), props)} />;
}
