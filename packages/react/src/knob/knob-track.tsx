import { Knob as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type KnobTrackProps = Headless.TrackProps;

/** Knob track: the arc of the whole travel, in the default border color. */
export function KnobTrack({ className, ...props }: KnobTrackProps): ReactElement {
  return <Headless.Track className={cx('contour-knob__track', className)} {...props} />;
}
