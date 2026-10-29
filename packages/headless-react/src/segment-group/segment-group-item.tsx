'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { SegmentGroupItemContext, useSegmentGroupContext } from './segment-group-context.ts';

export interface SegmentGroupItemProps extends PrimitiveProps<'label'> {
  /** The value of the item, unique in its group. */
  value: string;
  /**
   * Whether this item is disabled: it cannot be checked or focused.
   *
   * @defaultValue false
   */
  disabled?: boolean | undefined;
}

/**
 * Segment group item: a `label` around the native radio button of one value
 * (`SegmentGroup.ItemHiddenInput`), so a click anywhere on it checks the value. It carries
 * `data-state` (`checked` or `unchecked`), `data-disabled`, `data-focus` and `data-focus-visible`,
 * and gives its parts its state.
 *
 * @example
 * <SegmentGroup.Item value="week">
 *   <SegmentGroup.ItemText>Week</SegmentGroup.ItemText>
 *   <SegmentGroup.ItemHiddenInput />
 * </SegmentGroup.Item>
 */
export function SegmentGroupItem({
  value,
  disabled,
  ref,
  ...props
}: SegmentGroupItemProps): ReactElement {
  const api = useSegmentGroupContext();
  const item = { value, disabled };
  const ownProps = api.getItemProps(item);
  const composedRef = useComposedRefs<HTMLLabelElement>(ownProps.ref, ref);
  return (
    <SegmentGroupItemContext value={{ item, state: api.getItemState(item) }}>
      <Primitive.label {...mergeProps(ownProps, props)} ref={composedRef} />
    </SegmentGroupItemContext>
  );
}
