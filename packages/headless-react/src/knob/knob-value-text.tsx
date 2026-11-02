'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useKnobContext } from './knob-context.ts';

export type KnobValueTextProps = PrimitiveProps<'span'>;

/**
 * Knob value text: a `span` with the text of the value (`formatValue(value)`, or the number),
 * unless you give it children of your own.
 *
 * @example
 * <Knob.ValueText />
 */
export function KnobValueText({ children, ...props }: KnobValueTextProps): ReactElement {
  const api = useKnobContext();
  return (
    <Primitive.span {...mergeProps(api.getValueTextProps(), props)}>
      {children ?? api.valueText}
    </Primitive.span>
  );
}
