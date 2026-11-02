import type { SoundorTokens } from '@contour-ui/tokens/soundor';
import type { Style } from '@soundor/react';

/**
 * The focus ring of a control, as the web draws it (`outline: border-width.focus solid
 * border.focus`, `outline-offset: border-width.focus`): Soundor's outline, outside the border,
 * following its corners, taking no room in the layout. Spread it into a control's style while
 * its state says `focusVisible`.
 *
 * @example
 * style={[rootStyle(tokens, state), state.focusVisible && focusRingStyle(tokens)]}
 */
export function focusRingStyle(tokens: SoundorTokens): Style {
  const width = tokens['border-width'].focus;
  return {
    outlineWidth: width,
    outlineColor: tokens.color.border.focus,
    outlineOffset: width,
  };
}
