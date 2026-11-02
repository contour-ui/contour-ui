'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useKnobContext } from './knob-context.ts';

export type KnobThumbProps = PrimitiveProps<'line'>;

/**
 * Knob thumb: a `line` from near the center that points at the value, drawn in `currentColor`
 * with round caps. Put it in `Knob.Control`.
 *
 * @example
 * <Knob.Thumb />
 */
export function KnobThumb(props: KnobThumbProps): ReactElement {
  const api = useKnobContext();
  return <Primitive.line {...mergeProps(api.getThumbProps(), props)} />;
}
