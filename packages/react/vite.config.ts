import {
  chromium,
  contourSource,
  libraryPack,
  soundorProject,
  VISUAL_TESTS,
  visualProjects,
} from '@contour-ui/vite-config';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vite-plus';

/** Reads the package's sources from Node, so it runs outside the browser. */
const NODE_TESTS = ['src/client-boundary.test.ts'];

/** Tests of one platform: `*.web.test.tsx` run in Chromium only, `*.soundor.test.tsx` on Soundor. */
const SOUNDOR_TESTS = ['src/**/*.soundor.test.{ts,tsx}'];
const WEB_TESTS = ['src/**/*.web.test.{ts,tsx}'];

/**
 * The components that run on Soundor too: their tests (other than `*.web.test.tsx` and the
 * screenshot tests) run in both projects, the same files on both platforms.
 */
const CROSS_PLATFORM_TESTS: string[] = [
  'src/button/**/*.test.{ts,tsx}',
  'src/knob/**/*.test.{ts,tsx}',
];

export default defineConfig({
  plugins: [contourSource(), react()],
  pack: libraryPack({
    entry: {
      index: 'src/index.ts',
      // The components that run in Soundor plugin UIs, picked by the `soundor` condition.
      'index.soundor': 'src/index.soundor.ts',
      // The platform modules of `#platform/*` (package.json `imports`): each build of a module,
      // since the import stays `#platform/…` in dist and the app's bundler picks the build.
      'platform/styles.web': 'src/platform/styles.web.ts',
      'platform/styles.soundor': 'src/platform/styles.soundor.ts',
      // Without React: for code that runs before it, such as a root layout on the server.
      'theme-script': 'src/theme-provider/theme-script.ts',
      styles: 'src/styles.css',
    },
    // One file per module, so each keeps its `'use client'` for React Server Components.
    unbundle: true,
    // The platform modules stay imports, for the export conditions of the app's bundler.
    external: [/^#platform\//u],
  }),
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'react',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, ...NODE_TESTS, ...VISUAL_TESTS, ...SOUNDOR_TESTS],
          browser: chromium(),
        },
      },
      soundorProject('react', {
        include: [...CROSS_PLATFORM_TESTS, ...SOUNDOR_TESTS],
        exclude: [...WEB_TESTS, ...VISUAL_TESTS],
      }),
      // Screenshot tests, with `vp run visual` only: they need the browser in Docker.
      ...visualProjects('react'),
      {
        extends: true,
        test: { name: 'react:node', environment: 'node', include: NODE_TESTS },
      },
    ],
  },
});
