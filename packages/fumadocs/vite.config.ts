import path from 'node:path';

import {
  chromium,
  contourSource,
  libraryPack,
  VISUAL_TESTS,
  visualProjects,
} from '@contour-ui/vite-config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vite-plus';

/** Reads the package's sources from Node, so it runs outside the browser. */
const NODE_TESTS = ['src/client-boundary.test.ts'];

export default defineConfig({
  plugins: [contourSource(), react()],
  pack: libraryPack({
    entry: { index: 'src/index.ts', mdx: 'src/mdx/index.ts', styles: 'src/styles.css' },
    // One file per module, so each keeps its `'use client'` for React Server Components.
    unbundle: true,
  }),
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'fumadocs',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, ...NODE_TESTS, ...VISUAL_TESTS],
          browser: chromium(),
        },
      },
      // Screenshot tests, with `vp run visual` only: they need the browser in Docker.
      ...visualProjects('fumadocs'),
      {
        extends: true,
        test: { name: 'fumadocs:node', environment: 'node', include: NODE_TESTS },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(import.meta.dirname, '.storybook') })],
        test: {
          name: 'fumadocs:storybook',
          browser: chromium(),
        },
      },
    ],
  },
});
