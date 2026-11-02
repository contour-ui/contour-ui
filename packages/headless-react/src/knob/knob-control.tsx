'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useKnobContext } from './knob-context.ts';

export type KnobControlProps = PrimitiveProps<'svg'>;

/**
 * Knob control: the `svg` of the dial, with the `slider` role and the `viewBox` of the geometry
 * (`0 0 100 100`). It takes focus (not while disabled) and the input: a vertical drag (up raises
 * the value, Shift slows it down), the wheel, the arrow keys, Page Up and Page Down, Home and
 * End, and a double click, which resets the value. Put `Knob.Track`, `Knob.Range` and
 * `Knob.Thumb` inside it, or shapes of your own. Name it with `Knob.Label` or `aria-label`.
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
  const composedRef = useComposedRefs<SVGSVGElement>(ownProps.ref, ref);
  return <Primitive.svg {...mergeProps(ownProps, props)} ref={composedRef} />;
}
