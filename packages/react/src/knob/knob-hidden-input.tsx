'use client';

import { useStyles } from '#platform/styles';
import { Knob as Headless, useKnobContext } from '@contour-ui/headless';
import { mergeProps } from '@contour-ui/primitive';
import { use } from 'react';
import type { ReactElement } from 'react';

import { KnobSizeContext } from './knob-size.ts';
import { knobLook } from './knob.look.ts';

export type KnobHiddenInputProps = Headless.HiddenInputProps;

/**
 * Knob hidden input: the value of the knob for its form, under the `name` of the root. Native
 * platforms have no forms: there it renders nothing.
 */
export function KnobHiddenInput(props: KnobHiddenInputProps): ReactElement {
  const { hiddenInput } = useStyles(knobLook, { size: use(KnobSizeContext) }, useKnobContext());
  return <Headless.HiddenInput {...mergeProps(hiddenInput, props)} />;
}
