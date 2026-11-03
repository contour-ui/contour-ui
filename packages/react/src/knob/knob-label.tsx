'use client';

import { useStyles } from '#platform/styles';
import { Knob as Headless, useKnobContext } from '@contour-ui/headless';
import type { UseKnobReturn } from '@contour-ui/headless';
import { mergeProps, resolveStyle } from '@contour-ui/primitive';
import type { PartStyle } from '@contour-ui/primitive';
import { use } from 'react';
import type { ReactElement } from 'react';

import { KnobSizeContext } from './knob-size.ts';
import { knobLook } from './knob.look.ts';

export interface KnobLabelProps extends Omit<Headless.LabelProps, 'style'> {
  /**
   * Styles after the label's own: CSS properties on the web; on Soundor styles, or a function of
   * the knob (`useKnobContext()`) that returns them.
   */
  readonly style?: PartStyle<UseKnobReturn> | undefined;
}

/** Knob label: a muted caption above the dial that names it, in the `label` text style. */
export function KnobLabel(props: KnobLabelProps): ReactElement {
  const knob = useKnobContext();
  const { label } = useStyles(knobLook, { size: use(KnobSizeContext) }, knob);
  return (
    <Headless.Label {...mergeProps(label, { ...props, style: resolveStyle(props.style, knob) })} />
  );
}
