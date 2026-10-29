'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useSegmentGroupContext } from './segment-group-context.ts';

export type SegmentGroupIndicatorProps = PrimitiveProps<'div'>;

/**
 * Segment group indicator: a `div` that marks the checked item, hidden from assistive technology,
 * and `hidden` while no item is checked or laid out. Put it directly in `SegmentGroup.Root`. It
 * carries the box of the checked item as `--left`, `--top`, `--width` and `--height`, in pixels,
 * relative to the padding box of the root: position the root (`position: relative`) and the
 * indicator (`position: absolute`), and move it with these values, with a transition of your
 * own. It shows already in place when it was hidden, so the transition does not run then.
 *
 * @example
 * <SegmentGroup.Indicator
 *   style={{
 *     position: 'absolute',
 *     translate: 'var(--left) var(--top)',
 *     width: 'var(--width)',
 *     height: 'var(--height)',
 *   }}
 * />
 */
export function SegmentGroupIndicator({ ref, ...props }: SegmentGroupIndicatorProps): ReactElement {
  const api = useSegmentGroupContext();
  const ownProps = api.getIndicatorProps();
  const composedRef = useComposedRefs<HTMLDivElement>(ownProps.ref, ref);
  return <Primitive.div {...mergeProps(ownProps, props)} ref={composedRef} />;
}
