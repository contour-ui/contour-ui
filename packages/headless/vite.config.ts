import { chromium, contourSource, libraryPack, soundorProject } from '@contour-ui/vite-config';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vite-plus';

/** Reads the package's sources from Node, so it runs outside the browser. */
const NODE_TESTS = ['src/client-boundary.test.ts'];

/** Tests of one platform: `*.web.test.tsx` run in Chromium only, `*.soundor.test.tsx` on Soundor. */
const SOUNDOR_TESTS = ['src/**/*.soundor.test.{ts,tsx}'];
const WEB_TESTS = ['src/**/*.web.test.{ts,tsx}'];

/**
 * The components that run on Soundor too: their tests (other than `*.web.test.tsx`) run in both
 * projects, the same files on both platforms.
 */
const CROSS_PLATFORM_TESTS: string[] = ['src/knob/**/*.test.{ts,tsx}'];

export default defineConfig({
  plugins: [contourSource(), react()],
  pack: libraryPack({
    // One build of every module; two entries, as the export conditions pick them: the web (every
    // component) and Soundor (those that run there).
    entry: { index: 'src/index.ts', 'index.soundor': 'src/index.soundor.ts' },
    // One file per module, so each keeps its `'use client'` for React Server Components.
    unbundle: true,
  }),
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'headless',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, ...NODE_TESTS, ...SOUNDOR_TESTS],
          browser: chromium(),
        },
      },
      soundorProject('headless', {
        include: [...CROSS_PLATFORM_TESTS, ...SOUNDOR_TESTS],
        exclude: WEB_TESTS,
      }),
      {
        extends: true,
        test: { name: 'headless:node', environment: 'node', include: NODE_TESTS },
      },
    ],
  },
});
