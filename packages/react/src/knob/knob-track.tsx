'use client';

import { useStyles } from '#platform/styles';
import { Knob as Headless, useKnobContext } from '@contour-ui/headless';
import { mergeProps } from '@contour-ui/primitive';
import { use } from 'react';
import type { ReactElement } from 'react';

import { KnobSizeContext } from './knob-size.ts';
import { knobLook } from './knob.look.ts';

export type KnobTrackProps = Headless.TrackProps;

/** Knob track: the arc of the whole travel, in the default border color. */
export function KnobTrack(props: KnobTrackProps): ReactElement {
  const { track } = useStyles(knobLook, { size: use(KnobSizeContext) }, useKnobContext());
  return <Headless.Track {...mergeProps(track, props)} />;
}
