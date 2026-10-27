import path from 'node:path';

import { chromium, contourSource, libraryPack } from '@contour-ui/vite-config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [contourSource(), react()],
  pack: libraryPack({
    entry: {
      index: 'src/index.ts',
      // Without React: for code that runs before it, such as a root layout on the server.
      'theme-script': 'src/theme-provider/theme-script.ts',
      styles: 'src/styles.css',
    },
  }),
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'kit',
          include: ['src/**/*.test.{ts,tsx}'],
          browser: chromium(),
        },
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
