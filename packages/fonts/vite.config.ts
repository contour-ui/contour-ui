import { chromium, contourSource, libraryPack } from '@contour-ui/vite-config';
import { configDefaults, defineConfig } from 'vite-plus';

/** Tests that need a browser: the font faces of `fonts.css`. */
const BROWSER_TESTS = ['src/**/*.browser.test.ts'];

export default defineConfig({
  plugins: [contourSource()],
  pack: libraryPack({
    entry: { index: 'src/index.ts' },
    css: ['src/fonts.css'],
    copy: ['src/woff2', 'src/ttf', 'src/licenses'],
  }),
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'fonts',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: [...configDefaults.exclude, ...BROWSER_TESTS],
        },
      },
      {
        extends: true,
        test: { name: 'fonts:browser', include: BROWSER_TESTS, browser: chromium() },
      },
    ],
  },
});
