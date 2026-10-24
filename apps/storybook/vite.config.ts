import { defineConfig } from 'vite-plus';

/**
 * Visual tests screenshot the composed static build; the theme list comes from
 * the built `@contour-ui/tokens` (Playwright does not resolve the source condition).
 */
const VISUAL_INPUTS = ['@contour-ui/app-storybook#build-storybook', '@contour-ui/tokens#build'];

export default defineConfig({
  run: {
    tasks: {
      // Builds every package Storybook, then the host, into one deployable folder:
      // storybook-static/{index.html, tokens/, headless/, kit/, audio/}.
      'build-storybook': {
        command: ['storybook build --output-dir storybook-static', 'node scripts/compose.ts'],
        // Storybook wipes and rewrites its output directory, so results are not cacheable.
        cache: false,
        dependsOn: [
          '@contour-ui/tokens#build-storybook',
          '@contour-ui/headless#build-storybook',
          '@contour-ui/kit#build-storybook',
          '@contour-ui/audio#build-storybook',
        ],
      },
      // Screenshot tests (playwright.config.ts) in the pinned Playwright Linux image, via Docker.
      visual: {
        command: 'node scripts/visual.ts',
        cache: false,
        dependsOn: VISUAL_INPUTS,
      },
      'visual:update': {
        command: 'node scripts/visual.ts --update-snapshots',
        cache: false,
        dependsOn: VISUAL_INPUTS,
      },
      // Already inside that image (the CI job runs in it).
      'visual:ci': {
        command: 'playwright test',
        cache: false,
        dependsOn: VISUAL_INPUTS,
      },
    },
  },
});
