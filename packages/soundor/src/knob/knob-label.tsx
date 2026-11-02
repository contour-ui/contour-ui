import { Knob as Headless, useKnobContext } from '@contour-ui/soundor-headless';
import type { SoundorTokens } from '@contour-ui/tokens/soundor';
import type { Style } from '@soundor/react';
import type { ReactElement } from 'react';

import { useTokens } from '../theme-provider/use-theme.ts';
import { resolveStyle } from './knob-style.ts';
import type { KnobStyleProp } from './knob-style.ts';

export interface KnobLabelProps extends Omit<Headless.LabelProps, 'style'> {
  /** Styles after the label's own, or a function of the knob that returns them. */
  readonly style?: KnobStyleProp | undefined;
}

function labelStyle(tokens: SoundorTokens, disabled: boolean): Style {
  const { color } = tokens;
  return { ...tokens.text.label, color: disabled ? color.fg.disabled : color.fg.muted };
}

/** Knob label: a muted caption above the dial that names it, in the `label` text style. */
export function KnobLabel({ style, ...props }: KnobLabelProps): ReactElement {
  const tokens = useTokens();
  const knob = useKnobContext();
  return (
    <Headless.Label
      {...props}
      style={[labelStyle(tokens, knob.disabled), resolveStyle(style, knob)]}
    />
  );
}
