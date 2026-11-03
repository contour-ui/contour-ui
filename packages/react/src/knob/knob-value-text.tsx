'use client';

import { useStyles } from '#platform/styles';
import { Knob as Headless, useKnobContext } from '@contour-ui/headless-react';
import type { UseKnobReturn } from '@contour-ui/headless-react';
import { mergeProps, resolveStyle } from '@contour-ui/primitive';
import type { PartStyle } from '@contour-ui/primitive';
import { use } from 'react';
import type { ReactElement } from 'react';

import { KnobSizeContext } from './knob-size.ts';
import { knobLook } from './knob.look.ts';

export interface KnobValueTextProps extends Omit<Headless.ValueTextProps, 'style'> {
  /**
   * Styles after the readout's own: CSS properties on the web; on Soundor styles, or a function
   * of the knob (`useKnobContext()`) that returns them.
   */
  readonly style?: PartStyle<UseKnobReturn> | undefined;
}

/**
 * Knob value text: the readout of the value below the dial, in the monospace `value` text style,
 * so digits do not shift while it turns.
 */
export function KnobValueText(props: KnobValueTextProps): ReactElement {
  const knob = useKnobContext();
  const { valueText } = useStyles(knobLook, { size: use(KnobSizeContext) }, knob);
  return (
    <Headless.ValueText
      {...mergeProps(valueText, { ...props, style: resolveStyle(props.style, knob) })}
    />
  );
}
