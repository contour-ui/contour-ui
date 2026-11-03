'use client';

import { useStyles } from '#platform/styles';
import { Knob as Headless, useKnobContext } from '@contour-ui/headless-react';
import { mergeProps } from '@contour-ui/primitive';
import { use } from 'react';
import type { ReactElement } from 'react';

import { KnobSizeContext } from './knob-size.ts';
import { knobLook } from './knob.look.ts';

export type KnobRangeProps = Headless.RangeProps;

/**
 * Knob range: the arc from the origin to the value, in the accent fill, brighter while the dial
 * is hovered or dragged.
 */
export function KnobRange(props: KnobRangeProps): ReactElement {
  const { range } = useStyles(knobLook, { size: use(KnobSizeContext) }, useKnobContext());
  return <Headless.Range {...mergeProps(range, props)} />;
}
