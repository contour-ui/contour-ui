import path from 'node:path';

import { chromium, contourSource, libraryPack } from '@contour-ui/vite-config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [contourSource(), react()],
  pack: libraryPack({
    entry: { index: 'src/index.ts' },
    css: ['src/generated/tokens.css', 'src/fonts.css'],
  }),
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'tokens', environment: 'node', include: ['src/**/*.test.ts'] },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(import.meta.dirname, '.storybook') })],
        test: {
          name: 'tokens:storybook',
          browser: chromium(),
        },
      },
    ],
  },
});
