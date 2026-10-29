'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useSegmentGroupContext, useSegmentGroupItemContext } from './segment-group-context.ts';

export type SegmentGroupItemTextProps = PrimitiveProps<'span'>;

/**
 * Segment group item text: a `span` with the text of the item, which names its radio button.
 *
 * @example
 * <SegmentGroup.ItemText>Week</SegmentGroup.ItemText>
 */
export function SegmentGroupItemText(props: SegmentGroupItemTextProps): ReactElement {
  const api = useSegmentGroupContext();
  const { item } = useSegmentGroupItemContext();
  return <Primitive.span {...mergeProps(api.getItemTextProps(item), props)} />;
}
