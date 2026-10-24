import { defineConfig, devices } from '@playwright/test';

import { PORT } from './visual/site.ts';

/**
 * Visual regression tests against the composed static Storybook
 * (`visual/stories.spec.ts`). Screenshots are made and compared in the pinned
 * Playwright Linux image only: `vp run visual` / `vp run visual:update` locally
 * (Docker), the `visual` job in CI.
 */
export default defineConfig({
  testDir: 'visual',
  // `visual/__snapshots__/<storybook>/<story id>.<theme>.png`: one platform, no suffix.
  snapshotPathTemplate: '{testDir}/__snapshots__/{arg}{ext}',
  globalSetup: './visual/global-setup.ts',
  fullyParallel: true,
  forbidOnly: process.env['CI'] !== undefined,
  reporter: [[process.env['CI'] === undefined ? 'list' : 'github'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}/`,
  },
});
