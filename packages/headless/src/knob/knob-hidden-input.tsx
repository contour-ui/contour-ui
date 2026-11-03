'use client';

import { mergeProps, Primitive } from '@contour-ui/primitive';
import type { PrimitiveProps } from '@contour-ui/primitive';
import type { ReactElement } from 'react';

import { useKnobContext } from './knob-context.ts';

export type KnobHiddenInputProps = PrimitiveProps<'formValue'>;

/**
 * Knob hidden input: on the web, an `input type="hidden"` with the value, under the `name` of
 * the root, so a form submits it (`form` names a form the knob is outside of); a disabled knob's
 * value is left out, as a disabled input's is. Native platforms have no forms: it renders
 * nothing there.
 *
 * @example
 * <Knob.Root name="gain">
 *   <Knob.HiddenInput />
 * </Knob.Root>
 */
export function KnobHiddenInput(props: KnobHiddenInputProps): ReactElement {
  const api = useKnobContext();
  return <Primitive.formValue {...mergeProps(api.getHiddenInputProps(), props)} />;
}
