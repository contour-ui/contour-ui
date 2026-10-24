import { contourSource, libraryPack } from '@contour-ui/vite-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [contourSource()],
  pack: libraryPack({ entry: { index: 'src/index.ts', react: 'src/react/index.ts' } }),
  test: {
    name: 'core',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
