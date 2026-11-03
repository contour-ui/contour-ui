'use client';

import { mergeProps, Primitive } from '@contour-ui/primitive';
import type { PrimitiveProps } from '@contour-ui/primitive';
import type { ReactElement } from 'react';

import { useKnobContext } from './knob-context.ts';

export type KnobRangeProps = PrimitiveProps<'path'>;

/**
 * Knob range: a `path` along the track from the origin to the value, either way, drawn in
 * `currentColor` with round caps; empty while the value is at the origin. Put it in
 * `Knob.Control`, after `Knob.Track`.
 *
 * @example
 * <Knob.Range />
 */
export function KnobRange(props: KnobRangeProps): ReactElement {
  const api = useKnobContext();
  return <Primitive.path {...mergeProps(api.getRangeProps(), props)} />;
}
