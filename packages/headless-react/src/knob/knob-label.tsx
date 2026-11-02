'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useKnobContext } from './knob-context.ts';

export type KnobLabelProps = PrimitiveProps<'span'>;

/**
 * Knob label: a `span` that names the control (`aria-labelledby` on it).
 *
 * @example
 * <Knob.Label>Gain</Knob.Label>
 */
export function KnobLabel({ ref, ...props }: KnobLabelProps): ReactElement {
  const api = useKnobContext();
  const ownProps = api.getLabelProps();
  const composedRef = useComposedRefs<HTMLSpanElement>(ownProps.ref, ref);
  return <Primitive.span {...mergeProps(ownProps, props)} ref={composedRef} />;
}
