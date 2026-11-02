import { Knob as Headless, useKnobContext } from '@contour-ui/soundor-headless';
import type { ReactElement } from 'react';

import { useTokens } from '../theme-provider/use-theme.ts';

export type KnobRangeProps = Headless.RangeProps;

/**
 * Knob range: the arc from the origin to the value, in the accent fill, brighter while the dial
 * is hovered or dragged.
 */
export function KnobRange(props: KnobRangeProps): ReactElement {
  const { color } = useTokens();
  const { disabled, readOnly, hovered, dragging } = useKnobContext();
  // Nothing to turn while read-only: it keeps its color under the pointer, as on the web.
  const active = dragging || (hovered && !readOnly);
  let rangeColor = active ? color.accent['fill-hover'] : color.accent.fill;
  if (disabled) {
    rangeColor = color.fg.disabled;
  }
  return <Headless.Range color={rangeColor} {...props} />;
}
