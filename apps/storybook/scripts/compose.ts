/**
 * Copy each package's static Storybook into this host's build output, so the
 * production refs (`./tokens`, `./headless-react`, …) resolve inside one deployable folder.
 */
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';

import { PACKAGE_STORYBOOKS } from '../refs.ts';

const appDir = path.resolve(import.meta.dirname, '..');
const outDir = path.join(appDir, 'storybook-static');
const packagesDir = path.resolve(appDir, '../../packages');

for (const { name } of PACKAGE_STORYBOOKS) {
  const source = path.join(packagesDir, name, 'storybook-static');
  if (!existsSync(source)) {
    throw new Error(`Missing ${path.relative(appDir, source)}: run its build-storybook first.`);
  }
  const target = path.join(outDir, name);
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
  console.log(`composed ${name} -> ${path.relative(appDir, target)}`);
}
