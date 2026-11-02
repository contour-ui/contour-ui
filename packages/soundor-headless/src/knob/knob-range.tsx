import { Path } from '@soundor/react/svg';
import type { PathProps } from '@soundor/react/svg';
import type { ReactElement } from 'react';

import { mergeProps } from '../utils/merge-props.ts';
import { useKnobContext } from './knob-context.ts';

export type KnobRangeProps = PathProps;

/**
 * Knob range: a `Path` along the track from the origin to the value, either way, drawn in
 * `currentColor` (its `color`) with round caps; its path data is empty, and it draws nothing,
 * while the value is at the origin. Put it in `Knob.Control`, after `Knob.Track`.
 *
 * @example
 * <Knob.Range color="#51a0ff" />
 */
export function KnobRange(props: KnobRangeProps): ReactElement {
  const api = useKnobContext();
  return <Path {...mergeProps(api.getRangeProps(), props)} />;
}
