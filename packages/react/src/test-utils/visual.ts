import { defaultTheme, themeAttribute, themes, vars } from '@contour-ui/tokens';
import { defineVisualStates } from '@contour-ui/vite-config/visual';

import '@contour-ui/tokens/tokens.css';
import '@contour-ui/fonts/fonts.css';
import '../styles.css';

/**
 * Screenshot tests of this package (`*.visual.test.tsx`): each state in every theme, on the canvas
 * of an app page, checked with axe in the default theme.
 */
export const visualStates = defineVisualStates({
  themes,
  defaultTheme,
  attribute: themeAttribute,
  canvas: {
    background: vars.color.bg.canvas,
    color: vars.color.fg.default,
    font: vars.text.body.font,
    letterSpacing: vars.text.body.letterSpacing,
  },
});
