/**
 * Run the visual tests in the official Playwright Linux image that matches the
 * installed @playwright/test, so screenshots match CI: font rendering differs
 * between operating systems and CPU architectures. Arguments go to `playwright test`.
 *
 *   vp run visual           compare with the committed screenshots
 *   vp run visual:update    rewrite the screenshots that changed (review the diff)
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import playwright from '@playwright/test/package.json' with { type: 'json' };

const repoDir = path.resolve(import.meta.dirname, '../../..');
const image = `mcr.microsoft.com/playwright:v${playwright.version}-noble`;

const { status, error } = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '--init',
    '--ipc=host',
    // GitHub-hosted runners are x64: render on the same architecture (emulated on Apple silicon).
    '--platform=linux/amd64',
    `--volume=${repoDir}:/work`,
    '--workdir=/work/apps/storybook',
    image,
    // node_modules come from the host: Playwright and the tests are plain JavaScript,
    // the browsers are the image's own.
    'node',
    'node_modules/@playwright/test/cli.js',
    'test',
    ...process.argv.slice(2),
  ],
  { stdio: 'inherit' },
);
if (error !== undefined) {
  throw new Error('Visual tests run in Docker: https://docs.docker.com/get-started/get-docker/', {
    cause: error,
  });
}
if (status !== 0) {
  console.error(
    'Diffs: apps/storybook/playwright-report/index.html. Intended changes: vp run visual:update.',
  );
}
process.exitCode = status ?? 1;
