'use client';

import { mergeProps, Primitive, useComposedRefs } from '@contour-ui/primitive';
import type { PrimitiveNode, PrimitiveProps } from '@contour-ui/primitive';
import { useCallback } from 'react';
import type { ReactElement, RefCallback } from 'react';

import { useKnobContext } from './knob-context.ts';

export type KnobLabelProps = PrimitiveProps<'text'>;

/**
 * Knob label: a text (a `span` on the web) that names the control, which points at it by
 * `aria-labelledby`: by its generated id, or by the id you give it.
 *
 * @example
 * <Knob.Label>Gain</Knob.Label>
 */
export function KnobLabel({ ref, id, ...props }: KnobLabelProps): ReactElement {
  const { getLabelProps, registerLabel } = useKnobContext();
  // The id the label renders: the owner's, or the generated one.
  const labelId = id ?? getLabelProps().id;
  const labelRef = useCallback<RefCallback<PrimitiveNode<'text'>>>(
    (node) => (node === null ? undefined : registerLabel(labelId)),
    [registerLabel, labelId],
  );
  const composedRef = useComposedRefs<PrimitiveNode<'text'>>(labelRef, ref);
  return <Primitive.text {...mergeProps(getLabelProps(), props)} id={labelId} ref={composedRef} />;
}
