'use client';

import { mergeProps, Primitive, useComposedRefs } from '@contour-ui/primitive';
import type { PrimitiveNode, PrimitiveProps } from '@contour-ui/primitive';
import type { ReactElement } from 'react';

import { useKnobContext } from './knob-context.ts';

export type KnobControlProps = PrimitiveProps<'svg'>;

/**
 * Knob control: the `svg` of the dial, with the `slider` role and the `viewBox` of the geometry
 * (`0 0 100 100`). It takes focus (not while disabled) and the input: a vertical drag (up raises
 * the value, Shift slows it down), the wheel, the arrow keys, Page Up and Page Down, Home and
 * End, a double press, which resets the value, and the actions of assistive technology. Put
 * `Knob.Track`, `Knob.Range` and `Knob.Thumb` inside it, or shapes of your own. Name it with
 * `Knob.Label` or `aria-label`.
 *
 * @example
 * <Knob.Control>
 *   <Knob.Track />
 *   <Knob.Range />
 *   <Knob.Thumb />
 * </Knob.Control>
 */
export function KnobControl({ ref, ...props }: KnobControlProps): ReactElement {
  const api = useKnobContext();
  const ownProps = api.getControlProps();
  const composedRef = useComposedRefs<PrimitiveNode<'svg'>>(ownProps.ref, ref);
  return <Primitive.svg {...mergeProps(ownProps, props)} ref={composedRef} />;
}
