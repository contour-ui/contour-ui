'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useSegmentGroupContext } from './segment-group-context.ts';

export type SegmentGroupLabelProps = PrimitiveProps<'span'>;

/**
 * Segment group label: a `span` that names the group (`aria-labelledby` on the root).
 *
 * @example
 * <SegmentGroup.Label>Theme</SegmentGroup.Label>
 */
export function SegmentGroupLabel({ ref, ...props }: SegmentGroupLabelProps): ReactElement {
  const api = useSegmentGroupContext();
  const ownProps = api.getLabelProps();
  const composedRef = useComposedRefs<HTMLSpanElement>(ownProps.ref, ref);
  return <Primitive.span {...mergeProps(ownProps, props)} ref={composedRef} />;
}
