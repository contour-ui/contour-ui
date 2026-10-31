import { contourSource, libraryPack } from '@contour-ui/vite-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [contourSource()],
  pack: libraryPack({
    entry: { index: 'src/index.ts', soundor: 'src/soundor.ts' },
    css: ['src/generated/tokens.css'],
    copy: ['src/generated/docs.json'],
  }),
  test: {
    name: 'tokens',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
