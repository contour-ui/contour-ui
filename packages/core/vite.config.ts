import { chromium, contourSource, libraryPack } from '@contour-ui/vite-config';
import { configDefaults, defineConfig } from 'vite-plus';

export default defineConfig({
  plugins: [contourSource()],
  pack: libraryPack({ entry: { index: 'src/index.ts', react: 'src/react/index.ts' } }),
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'core',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: [...configDefaults.exclude, 'src/react/**'],
        },
      },
      {
        // React hooks run in a real browser (React DOM), like the headless components.
        extends: true,
        test: {
          name: 'core:react',
          include: ['src/react/**/*.test.{ts,tsx}'],
          browser: chromium(),
        },
      },
    ],
  },
});
