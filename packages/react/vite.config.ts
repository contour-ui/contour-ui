import {
  chromium,
  contourSource,
  libraryPack,
  VISUAL_TESTS,
  visualProjects,
} from '@contour-ui/vite-config';
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
          name: 'react',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, ...NODE_TESTS, ...VISUAL_TESTS],
          browser: chromium(),
        },
      },
      // Screenshot tests, with `vp run visual` only: they need the browser in Docker.
      ...visualProjects('react'),
      {
        extends: true,
        test: { name: 'react:node', environment: 'node', include: NODE_TESTS },
      },
    ],
  },
});
