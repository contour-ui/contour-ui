import { withThemes } from '@contour-ui/vite-config/storybook-preview';
import type { Preview } from '@storybook/react-vite';

import { defaultTheme, themeAttribute, themes, vars } from '../src/index.ts';

import '../src/generated/tokens.css';
import '../src/fonts.css';

const preview: Preview = withThemes(
  {
    // Screenshot tests (apps/storybook/visual) cover every story; `tags: ['!visual']` opts out.
    tags: ['visual'],
    parameters: {
      // Accessibility violations fail story tests.
      a11y: { test: 'error' },
    },
  },
  {
    themes,
    defaultTheme,
    attribute: themeAttribute,
    canvas: {
      background: vars.color.bg.canvas,
      color: vars.color.fg.default,
      font: vars.text.body.font,
      letterSpacing: vars.text.body.letterSpacing,
    },
  },
);

export default preview;
