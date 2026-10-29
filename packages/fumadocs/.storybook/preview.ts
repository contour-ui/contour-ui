import { defaultTheme, themeAttribute, themes, vars } from '@contour-ui/tokens';
import { withThemes } from '@contour-ui/vite-config/storybook-preview';
import type { Preview } from '@storybook/react-vite';
import { MINIMAL_VIEWPORTS } from 'storybook/viewport';

import { docsAnnotations, withDocs } from '../src/test-utils/storybook.tsx';

import '@contour-ui/tokens/tokens.css';
import '@contour-ui/tokens/fonts.css';
// Before Kit's styles: its first rule is the order of the cascade layers, Kit's included.
import '../src/styles.css';
import '@contour-ui/react/styles.css';

const preview: Preview = withThemes(
  {
    // Screenshot tests (apps/storybook/visual) cover every story; `tags: ['!visual']` opts out.
    tags: ['visual'],
    // Inside the themed canvas: each story is a page of a docs site, started afresh.
    ...docsAnnotations,
    decorators: [withDocs],
    parameters: {
      // Accessibility violations fail story tests.
      a11y: { test: 'error' },
      viewport: {
        options: {
          ...MINIMAL_VIEWPORTS,
          // The phone the docs layout is checked on; story tests resize the browser to it. A story
          // at this width carries the `phone` tag too: the screenshot tests read the tags only.
          phone: { name: 'Phone', styles: { width: '390px', height: '844px' }, type: 'mobile' },
        },
      },
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
