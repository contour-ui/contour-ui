'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useKnobContext } from './knob-context.ts';

export type KnobHiddenInputProps = PrimitiveProps<'input'>;

/**
 * Knob hidden input: an `input type="hidden"` with the value, under the `name` of the root, so
 * a form submits it (`form` names a form the knob is outside of). A disabled knob's value is left
 * out, as a disabled input's is.
 *
 * @example
 * <Knob.Root name="gain">
 *   <Knob.HiddenInput />
 * </Knob.Root>
 */
export function KnobHiddenInput(props: KnobHiddenInputProps): ReactElement {
  const api = useKnobContext();
  return <Primitive.input {...mergeProps(api.getHiddenInputProps(), props)} />;
}
