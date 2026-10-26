import { defineConfig, devices } from '@playwright/test';

import { PORT } from './e2e/site.ts';

/** A running copy of the site to test instead of the static build, such as a dev server. */
const siteUrl = process.env['DOCS_URL'];

/**
 * End-to-end and accessibility tests of the docs site (`e2e/`), against the static build served
 * as a static host serves it (`e2e/global-setup.ts`); `vp -C apps/docs run e2e` builds the site
 * first. They check behavior, not pixels, so they run on any machine.
 *
 * `DOCS_URL` points them at another copy of the site, such as a dev server while you write a
 * test. A dev server answers unknown paths with 200, so the 404 tests fail there.
 */
export default defineConfig({
  testDir: 'e2e',
  ...(siteUrl === undefined ? { globalSetup: './e2e/global-setup.ts' } : {}),
  fullyParallel: true,
  forbidOnly: process.env['CI'] !== undefined,
  reporter: [[process.env['CI'] === undefined ? 'list' : 'github'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: siteUrl ?? `http://localhost:${PORT}/`,
    // A stuck step fails as itself, well within the test's 30 s.
    actionTimeout: 5000,
    navigationTimeout: 10_000,
    // Failed tests keep a trace in the HTML report, which CI uploads.
    trace: 'retain-on-failure',
  },
});
