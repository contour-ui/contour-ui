import { Path } from '@soundor/react/svg';
import type { PathProps } from '@soundor/react/svg';
import type { ReactElement } from 'react';

import { mergeProps } from '../utils/merge-props.ts';
import { useKnobContext } from './knob-context.ts';

export type KnobTrackProps = PathProps;

/**
 * Knob track: a `Path` of the whole travel, an arc of 270° open at the bottom, drawn in
 * `currentColor` (its `color`) with round caps. Put it in `Knob.Control`.
 *
 * @example
 * <Knob.Track color="#3d4044" />
 */
export function KnobTrack(props: KnobTrackProps): ReactElement {
  const api = useKnobContext();
  return <Path {...mergeProps(api.getTrackProps(), props)} />;
}
