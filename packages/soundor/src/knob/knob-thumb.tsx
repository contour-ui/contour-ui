import { Knob as Headless, useKnobContext } from '@contour-ui/soundor-headless';
import type { ReactElement } from 'react';

import { useTokens } from '../theme-provider/use-theme.ts';

export type KnobThumbProps = Headless.ThumbProps;

/** Knob thumb: the line that points at the value, in the default text color. */
export function KnobThumb(props: KnobThumbProps): ReactElement {
  const { color } = useTokens();
  const { disabled } = useKnobContext();
  return <Headless.Thumb color={disabled ? color.fg.disabled : color.fg.default} {...props} />;
}
