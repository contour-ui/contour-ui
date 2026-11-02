import { Text } from '@soundor/react';
import type { TextProps } from '@soundor/react';
import type { ReactElement } from 'react';

import { mergeProps } from '../utils/merge-props.ts';
import { useKnobContext } from './knob-context.ts';

export type KnobValueTextProps = TextProps;

/**
 * Knob value text: a `Text` with the text of the value (`formatValue(value)`, or the number),
 * unless you give it children of your own. Assistive technology reads the value with the
 * control, not on its own.
 *
 * @example
 * <Knob.ValueText />
 */
export function KnobValueText({ children, ...props }: KnobValueTextProps): ReactElement {
  const api = useKnobContext();
  return <Text {...mergeProps(api.getValueTextProps(), props)}>{children ?? api.valueText}</Text>;
}
