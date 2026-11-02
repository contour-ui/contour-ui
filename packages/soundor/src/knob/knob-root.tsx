import { Knob as Headless } from '@contour-ui/soundor-headless';
import type { SoundorTokens } from '@contour-ui/tokens/soundor';
import type { Style } from '@soundor/react';
import type { ReactElement } from 'react';

import { useTokens } from '../theme-provider/use-theme.ts';
import { KnobSizeContext } from './knob-style.ts';
import type { KnobSize } from './knob-style.ts';

export interface KnobRootProps extends Headless.RootProps {
  /**
   * The diameter of the dial: `sm`, `md` or `lg`, the `size.knob-*` tokens.
   *
   * @defaultValue 'md'
   */
  readonly size?: KnobSize | undefined;
}

/** A column of the label, the dial and the readout, centered, a control gap apart. */
function rootStyle(tokens: SoundorTokens): Style {
  return {
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.space['control-gap'],
  };
}

/**
 * Knob root: a rotary control for audio-plugin UIs, a column of its label, its dial and its value
 * readout. Runs the knob of `@contour-ui/soundor-headless`: drag up or down (Shift for fine
 * moves), turn the wheel, use the arrow keys, or double-press to reset. The same props as the
 * `Knob.Root` of `@contour-ui/react`, drawn with the token values of the theme. Name it with
 * `Knob.Label`, or `accessibilityLabel` on `Knob.Control`.
 *
 * @example
 * <Knob.Root min={-60} max={12} defaultValue={0} step={0.1} formatValue={formatDecibels}>
 *   <Knob.Label>Gain</Knob.Label>
 *   <Knob.Control />
 *   <Knob.ValueText />
 * </Knob.Root>
 */
export function KnobRoot({ size = 'md', style, ...props }: KnobRootProps): ReactElement {
  const tokens = useTokens();
  return (
    <KnobSizeContext value={size}>
      <Headless.Root {...props} style={[rootStyle(tokens), style]} />
    </KnobSizeContext>
  );
}
