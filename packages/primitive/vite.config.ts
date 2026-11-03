import { chromium, contourSource, libraryPack, soundorProject } from '@contour-ui/vite-config';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vite-plus';

/** Reads the package's sources from Node, so it runs outside the browser. */
const NODE_TESTS = ['src/client-boundary.test.ts'];

export default defineConfig({
  plugins: [contourSource(), react()],
  pack: libraryPack({
    // One build per platform, picked by the export conditions of the app's bundler: the web
    // (the default) and Soundor (`soundor`).
    entry: { 'web/index': 'src/web/index.ts', 'soundor/index': 'src/soundor/index.ts' },
    // One file per module, so each keeps its `'use client'` for React Server Components.
    unbundle: true,
    // The runtime's own modules: every Soundor runtime provides them to the plugin.
    external: [/^soundor:/u],
  }),
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'primitive',
          include: ['src/shared/**/*.test.{ts,tsx}', 'src/web/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, ...NODE_TESTS],
          browser: chromium(),
        },
      },
      soundorProject('primitive', {
        include: [
          'src/shared/**/*.test.{ts,tsx}',
          'src/native/**/*.test.{ts,tsx}',
          'src/soundor/**/*.test.{ts,tsx}',
        ],
      }),
      {
        extends: true,
        test: { name: 'primitive:node', environment: 'node', include: NODE_TESTS },
      },
    ],
  },
});
