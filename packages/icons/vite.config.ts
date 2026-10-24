import { contourSource, libraryPack } from '@contour-ui/vite-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [contourSource()],
  pack: libraryPack({ entry: { index: 'src/index.ts' } }),
  test: {
    name: 'icons',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
