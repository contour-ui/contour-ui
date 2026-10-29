'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { SegmentGroupContext } from './segment-group-context.ts';
import { useSegmentGroup } from './use-segment-group.ts';
import type { UseSegmentGroupProps } from './use-segment-group.ts';

export interface SegmentGroupRootProps
  extends UseSegmentGroupProps, Omit<PrimitiveProps<'div'>, keyof UseSegmentGroupProps> {}

/**
 * Segment group root: a `div` with the `radiogroup` role that runs the segment group machine
 * and gives its parts the state. Name it with `SegmentGroup.Label` or `aria-label`. Position it
 * (`position: relative`) when it holds a `SegmentGroup.Indicator`.
 *
 * @example
 * <SegmentGroup.Root defaultValue="day">
 *   <SegmentGroup.Label>Range</SegmentGroup.Label>
 *   <SegmentGroup.Item value="day">
 *     <SegmentGroup.ItemText>Day</SegmentGroup.ItemText>
 *     <SegmentGroup.ItemHiddenInput />
 *   </SegmentGroup.Item>
 * </SegmentGroup.Root>
 */
export function SegmentGroupRoot({
  value,
  defaultValue,
  onValueChange,
  disabled,
  readOnly,
  orientation,
  name,
  form,
  ...props
}: SegmentGroupRootProps): ReactElement {
  const api = useSegmentGroup({
    value,
    defaultValue,
    onValueChange,
    disabled,
    readOnly,
    orientation,
    name,
    form,
  });
  return (
    <SegmentGroupContext value={api}>
      <Primitive.div {...mergeProps(api.getRootProps(), props)} />
    </SegmentGroupContext>
  );
}
