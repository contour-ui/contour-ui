import path from 'node:path';

import { chromium, contourSource, libraryPack } from '@contour-ui/vite-config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vite-plus';

/** Reads the package's sources from Node, so it runs outside the browser. */
const NODE_TESTS = ['src/client-boundary.test.ts'];

export default defineConfig({
  plugins: [contourSource(), react()],
  pack: libraryPack({
    entry: {
      index: 'src/index.ts',
      // Without React: for code that runs before it, such as a root layout on the server.
      'theme-script': 'src/theme-provider/theme-script.ts',
      styles: 'src/styles.css',
    },
    // One file per module, so each keeps its `'use client'` for React Server Components.
    unbundle: true,
  }),
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'kit',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, ...NODE_TESTS],
          browser: chromium(),
        },
      },
      {
        extends: true,
        test: { name: 'kit:node', environment: 'node', include: NODE_TESTS },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(import.meta.dirname, '.storybook') })],
        test: {
          name: 'kit:storybook',
          browser: chromium(),
        },
      },
    ],
  },
});
