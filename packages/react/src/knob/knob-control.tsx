'use client';

import { useStyles } from '#platform/styles';
import { Knob as Headless, useKnobContext } from '@contour-ui/headless';
import type { UseKnobReturn } from '@contour-ui/headless';
import { mergeProps, resolveStyle } from '@contour-ui/primitive';
import type { PartStyle } from '@contour-ui/primitive';
import { use } from 'react';
import type { ReactElement } from 'react';

import { KnobRange } from './knob-range.tsx';
import { KnobSizeContext } from './knob-size.ts';
import { KnobThumb } from './knob-thumb.tsx';
import { KnobTrack } from './knob-track.tsx';
import { knobLook } from './knob.look.ts';

export interface KnobControlProps extends Omit<Headless.ControlProps, 'style'> {
  /**
   * Styles after the dial's own: CSS properties on the web; on Soundor styles, or a function of
   * the knob (`useKnobContext()`) that returns them.
   */
  readonly style?: PartStyle<UseKnobReturn> | undefined;
}

/**
 * Knob control: the round dial, as large as the size of the root, which takes focus and the
 * input, with the focus ring of a button from the keyboard. Without children, it draws the
 * track, the range and the thumb; give it children to draw shapes of your own in its
 * `0 0 100 100` view box.
 */
export function KnobControl({ children, ...props }: KnobControlProps): ReactElement {
  const knob = useKnobContext();
  const { control } = useStyles(knobLook, { size: use(KnobSizeContext) }, knob);
  return (
    <Headless.Control
      {...mergeProps(control, { ...props, style: resolveStyle(props.style, knob) })}
    >
      {children ?? (
        <>
          <KnobTrack />
          <KnobRange />
          <KnobThumb />
        </>
      )}
    </Headless.Control>
  );
}
