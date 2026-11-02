import { Knob as Headless, useKnobContext } from '@contour-ui/soundor-headless';
import type { ReactElement } from 'react';

import { useTokens } from '../theme-provider/use-theme.ts';

export type KnobTrackProps = Headless.TrackProps;

/** Knob track: the arc of the whole travel, in the default border color. */
export function KnobTrack(props: KnobTrackProps): ReactElement {
  const { color } = useTokens();
  const { disabled } = useKnobContext();
  return (
    <Headless.Track color={disabled ? color.border.subtle : color.border.default} {...props} />
  );
}
