import { Text } from '@soundor/react';
import type { TextProps } from '@soundor/react';
import type { ReactElement } from 'react';

import { useComposedRefs } from '../utils/compose-refs.ts';
import { mergeProps } from '../utils/merge-props.ts';
import { useKnobContext } from './knob-context.ts';

export type KnobLabelProps = TextProps;

/**
 * Knob label: a `Text` whose text names the control (its `accessibilityLabel`). Assistive
 * technology reads it with the control, not on its own.
 *
 * @example
 * <Knob.Label>Gain</Knob.Label>
 */
export function KnobLabel({ ref, ...props }: KnobLabelProps): ReactElement {
  const api = useKnobContext();
  const own = api.getLabelProps();
  const composedRef = useComposedRefs(own.ref, ref);
  return <Text {...mergeProps(own, props)} ref={composedRef} />;
}
