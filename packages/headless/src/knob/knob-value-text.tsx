'use client';

import { mergeProps, Primitive } from '@contour-ui/primitive';
import type { PrimitiveProps } from '@contour-ui/primitive';
import type { ReactElement } from 'react';

import { useKnobContext } from './knob-context.ts';

export type KnobValueTextProps = PrimitiveProps<'text'>;

/**
 * Knob value text: a text (a `span` on the web) with the text of the value (`formatValue(value)`,
 * or the number), unless you give it children of your own. It is hidden from assistive
 * technology, which reads the value with the control.
 *
 * @example
 * <Knob.ValueText />
 */
export function KnobValueText({ children, ...props }: KnobValueTextProps): ReactElement {
  const api = useKnobContext();
  return (
    <Primitive.text {...mergeProps(api.getValueTextProps(), props)}>
      {children ?? api.valueText}
    </Primitive.text>
  );
}
