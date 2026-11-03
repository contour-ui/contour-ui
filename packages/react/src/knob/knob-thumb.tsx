'use client';

import { useStyles } from '#platform/styles';
import { Knob as Headless, useKnobContext } from '@contour-ui/headless-react';
import { mergeProps } from '@contour-ui/primitive';
import { use } from 'react';
import type { ReactElement } from 'react';

import { KnobSizeContext } from './knob-size.ts';
import { knobLook } from './knob.look.ts';

export type KnobThumbProps = Headless.ThumbProps;

/** Knob thumb: the line that points at the value, in the default text color. */
export function KnobThumb(props: KnobThumbProps): ReactElement {
  const { thumb } = useStyles(knobLook, { size: use(KnobSizeContext) }, useKnobContext());
  return <Headless.Thumb {...mergeProps(thumb, props)} />;
}
