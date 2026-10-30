/**
 * Screenshot tests (`*.visual.test.tsx`) of every package that has them, compared with the
 * screenshots committed in `__visual__/` beside them. The browser is Chromium of the pinned
 * Playwright Linux image, the one CI runs in, so screenshots compare pixel for pixel on any
 * machine: `playwright run-server` in Docker, which Vitest on this machine drives. A server
 * already listening on the port is used as is and left running.
 *
 *   vp run visual           compare
 *   vp run visual:update    rewrite every screenshot, so stale ones disappear; review the diff
 *   vp run visual:ci        inside that image (the CI job): no Docker, the image's own Chromium
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import playwright from 'playwright/package.json' with { type: 'json' };

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = 6677;
const CONTAINER = 'contour-visual';
const IMAGE = `mcr.microsoft.com/playwright:v${playwright.version}-noble`;
const SCREENSHOTS = '__visual__';

const update = process.argv.includes('--update');
const ci = process.argv.includes('--ci');

/** Files below `dir`, as paths relative to it, without `node_modules`. */
function filesIn(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter(
    (file) => !file.split(path.sep).includes('node_modules'),
  );
}

/** Packages with screenshot tests, by folder name (`react`, `fumadocs`). */
const packages = readdirSync(path.join(ROOT, 'packages')).filter((name) => {
  const src = path.join(ROOT, 'packages', name, 'src');
  return existsSync(src) && filesIn(src).some((file) => file.endsWith('.visual.test.tsx'));
});

/** The `__visual__` folders of a package. */
function screenshotDirs(name: string): string[] {
  const src = path.join(ROOT, 'packages', name, 'src');
  return filesIn(src)
    .filter((file) => path.basename(file) === SCREENSHOTS)
    .map((file) => path.join(src, file));
}

/** Whether something accepts connections on the port. */
function listening(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect(PORT, '127.0.0.1');
    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.once('error', () => {
      resolve(false);
    });
  });
}

function docker(args: string[]): { status: number | null; stdout: string } {
  const { status, stdout, error } = spawnSync('docker', args, { encoding: 'utf8' });
  if (error !== undefined) {
    throw new Error('The screenshot tests run their browser in Docker: start Docker first.', {
      cause: error,
    });
  }
  return { status, stdout };
}

/** Starts the server in the image (linux/amd64, as the GitHub-hosted runners) and waits for it. */
async function startServer(): Promise<void> {
  const { status } = docker([
    'run',
    '--detach',
    '--rm',
    `--name=${CONTAINER}`,
    '--init',
    '--ipc=host',
    '--platform=linux/amd64',
    `--publish=127.0.0.1:${PORT}:${PORT}`,
    // Playwright comes from the repository's node_modules (plain JavaScript); the browsers are
    // the image's own.
    `--volume=${ROOT}:/work`,
    '--workdir=/work',
    IMAGE,
    'node',
    'node_modules/playwright/cli.js',
    'run-server',
    `--port=${PORT}`,
    '--host=0.0.0.0',
  ]);
  if (status !== 0) {
    throw new Error(`Could not start ${IMAGE}: is Docker running?`);
  }
  // Docker accepts connections on the port before the server listens: wait for its log line.
  const deadline = Date.now() + 120_000;
  while (!docker(['logs', CONTAINER]).stdout.includes('Listening on')) {
    if (Date.now() > deadline) {
      docker(['stop', CONTAINER]);
      throw new Error('The Playwright server did not start in two minutes.');
    }
    // Polling: each look at the log waits for the one before.
    // oxlint-disable-next-line no-await-in-loop
    await delay(500);
  }
}

let started = false;
if (!ci && !(await listening())) {
  await startServer();
  started = true;
}

let failed = false;
try {
  for (const name of packages) {
    if (update) {
      for (const dir of screenshotDirs(name)) {
        rmSync(dir, { recursive: true });
      }
    }
    const { status } = spawnSync(
      'vp',
      ['-C', `packages/${name}`, 'test', '--project', `${name}:visual`, ...(update ? ['-u'] : [])],
      {
        cwd: ROOT,
        stdio: 'inherit',
        env: {
          ...process.env,
          CONTOUR_VISUAL: '1',
          ...(ci ? {} : { CONTOUR_VISUAL_SERVER: `ws://127.0.0.1:${PORT}/` }),
        },
      },
    );
    failed ||= status !== 0;
  }
} finally {
  if (started) {
    docker(['stop', CONTAINER]);
  }
}

// Screenshots of a test file that is gone. A screenshot a test no longer takes stays until
// `vp run visual:update`, which rewrites them all.
const stale = packages
  .flatMap((name) => screenshotDirs(name))
  .flatMap((dir) =>
    readdirSync(dir)
      .filter((testFile) => !existsSync(path.join(dir, '..', testFile)))
      .map((testFile) => path.relative(ROOT, path.join(dir, testFile))),
  );
if (stale.length > 0 && !update) {
  console.error(
    `Screenshots of removed test files (delete them with \`vp run visual:update\`):\n  ${stale.join('\n  ')}`,
  );
  failed = true;
}
process.exitCode = failed ? 1 : 0;
