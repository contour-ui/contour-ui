import { Knob as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';
import { KnobRange } from './knob-range.tsx';
import { KnobThumb } from './knob-thumb.tsx';
import { KnobTrack } from './knob-track.tsx';

export type KnobControlProps = Headless.ControlProps;

/**
 * Knob control: the round dial, as large as the size of the root, which takes focus and the
 * input. Without children, it draws the track, the range and the thumb; give it children to draw
 * shapes of your own in its `0 0 100 100` view box.
 */
export function KnobControl({ className, children, ...props }: KnobControlProps): ReactElement {
  return (
    <Headless.Control className={cx('contour-knob__control', className)} {...props}>
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
