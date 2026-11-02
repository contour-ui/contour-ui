'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useKnobContext } from './knob-context.ts';

export type KnobTrackProps = PrimitiveProps<'path'>;

/**
 * Knob track: a `path` of the whole travel, an arc of 270° open at the bottom, drawn in
 * `currentColor` with round caps. Put it in `Knob.Control`.
 *
 * @example
 * <Knob.Track />
 */
export function KnobTrack(props: KnobTrackProps): ReactElement {
  const api = useKnobContext();
  return <Primitive.path {...mergeProps(api.getTrackProps(), props)} />;
}
