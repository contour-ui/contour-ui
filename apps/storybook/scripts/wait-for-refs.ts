/**
 * Dev only: wait until every package Storybook answers, then let the host start.
 *
 * The host checks its refs once, at startup. A ref that is not up yet stays
 * unchecked and is later fetched with credentials, which the package dev
 * servers reject (CORS `*`), so its stories never load.
 */
import { setTimeout as delay } from 'node:timers/promises';

import { PACKAGE_STORYBOOKS } from '../refs.ts';
import type { PackageStorybook } from '../refs.ts';

const TIMEOUT_MS = 120_000;
const deadline = Date.now() + TIMEOUT_MS;

async function isUp({ port }: PackageStorybook): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/iframe.html`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitFor(pending: readonly PackageStorybook[]): Promise<PackageStorybook[]> {
  const states = await Promise.all(pending.map(async (ref) => ({ ref, up: await isUp(ref) })));
  const down = states.filter(({ up }) => !up).map(({ ref }) => ref);
  if (down.length === 0 || Date.now() > deadline) {
    return down;
  }
  await delay(1000);
  return waitFor(down);
}

const down = await waitFor(PACKAGE_STORYBOOKS);
if (down.length > 0) {
  const names = down.map(({ name, port }) => `${name} (:${port})`).join(', ');
  console.warn(
    `Not reachable after ${TIMEOUT_MS / 1000}s: ${names}. Their refs will show an error.`,
  );
}
