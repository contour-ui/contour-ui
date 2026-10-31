import {
  contrast,
  css,
  designTokens,
  docs,
  gamut,
  paletteSteps,
  soundorPlatform,
  values,
  vars,
  webPlatform,
} from '@contour-ui/tokens-compiler';
import { libraryPack } from '@contour-ui/vite-config';
import { defineConfig } from 'vite-plus';

// How each platform writes a token, shared by its outputs.
const web = webPlatform({ prefix: 'ct', themeAttribute: 'data-theme' });
const soundor = soundorPlatform({
  // Soundor has no cubic-bezier(): the named easing each curve becomes.
  easing: {
    'base.easing.standard': 'ease-in-out',
    'base.easing.out': 'ease-out',
    'base.easing.in': 'ease-in',
  },
});

export default defineConfig({
  pack: libraryPack({
    plugins: [
      designTokens({
        // The DTCG resolver names the themes and the files they read.
        resolver: './contour.resolver.json',
        // Everything the package ships.
        outputs: [
          css(web, { file: 'tokens.css' }),
          vars(web, { entry: 'index' }),
          docs(web, { file: 'docs.json' }),
          values(soundor, { entry: 'soundor', name: 'soundorTokens' }),
        ],
        // Rules beyond the built-in ones; a violation fails the build.
        checks: [contrast('./contrast.json'), paletteSteps('base.color'), gamut('srgb')],
      }),
    ],
  }),
  run: {
    tasks: {
      // A task, not a package.json script: Vite+ caches tasks by the files they read.
      build: { command: 'vp pack' },
    },
  },
});
