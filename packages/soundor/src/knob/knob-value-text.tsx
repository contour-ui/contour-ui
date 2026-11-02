import { Knob as Headless, useKnobContext } from '@contour-ui/soundor-headless';
import type { SoundorTokens } from '@contour-ui/tokens/soundor';
import type { Style } from '@soundor/react';
import type { ReactElement } from 'react';

import { useTokens } from '../theme-provider/use-theme.ts';
import { resolveStyle } from './knob-style.ts';
import type { KnobStyleProp } from './knob-style.ts';

export interface KnobValueTextProps extends Omit<Headless.ValueTextProps, 'style'> {
  /** Styles after the readout's own, or a function of the knob that returns them. */
  readonly style?: KnobStyleProp | undefined;
}

function valueTextStyle(tokens: SoundorTokens, disabled: boolean): Style {
  const { color } = tokens;
  return { ...tokens.text.value, color: disabled ? color.fg.disabled : color.fg.default };
}

/**
 * Knob value text: the readout of the value below the dial, in the monospace `value` text style,
 * so digits do not shift while it turns.
 */
export function KnobValueText({ style, ...props }: KnobValueTextProps): ReactElement {
  const tokens = useTokens();
  const knob = useKnobContext();
  return (
    <Headless.ValueText
      {...props}
      style={[valueTextStyle(tokens, knob.disabled), resolveStyle(style, knob)]}
    />
  );
}
