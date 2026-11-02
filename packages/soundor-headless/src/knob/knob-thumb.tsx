import { Line } from '@soundor/react/svg';
import type { LineProps } from '@soundor/react/svg';
import type { ReactElement } from 'react';

import { mergeProps } from '../utils/merge-props.ts';
import { useKnobContext } from './knob-context.ts';

export type KnobThumbProps = LineProps;

/**
 * Knob thumb: a `Line` from near the center that points at the value, drawn in `currentColor`
 * (its `color`) with round caps. Put it in `Knob.Control`.
 *
 * @example
 * <Knob.Thumb color="#f2f5fb" />
 */
export function KnobThumb(props: KnobThumbProps): ReactElement {
  const api = useKnobContext();
  return <Line {...mergeProps(api.getThumbProps(), props)} />;
}
