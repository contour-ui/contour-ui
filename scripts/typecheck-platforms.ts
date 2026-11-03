/**
 * Type-check the cross-platform packages under the conditions of every platform but the web.
 *
 * `vp check` reads each file in the first TypeScript project that includes it, the web one, so
 * shared code (the parts of `headless`, the components of `react`, the shared folder of
 * `primitive`) compiles there under the default condition only. Each cross-platform package has a
 * `tsconfig.soundor.json` that compiles it again under `soundor`, without the DOM: a web-only prop
 * or API in shared code fails here. One project at a time.
 *
 * Run: `vp run typecheck:platforms` (or `node scripts/typecheck-platforms.ts`).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { LAYERS } from './layers.ts';

const root = path.join(import.meta.dirname, '..');
const tsc = path.join(root, 'node_modules', '.bin', 'tsc');

const projects = [
  ...LAYERS.filter((pkg) => pkg.react === 'renderers' || pkg.react === 'cross-platform').map(
    (pkg) => `packages/${pkg.name}/tsconfig.soundor.json`,
  ),
  'tooling/test-harness/tsconfig.soundor.json',
];

let failed = 0;
for (const project of projects) {
  if (!existsSync(path.join(root, project))) {
    console.error(`✘ ${project}: missing (every cross-platform package has one).`);
    failed += 1;
    continue;
  }
  const result = spawnSync(tsc, ['-p', project, '--noEmit'], { cwd: root, stdio: 'inherit' });
  if (result.status === 0) {
    console.log(`✔ ${project}`);
  } else {
    console.error(`✘ ${project}`);
    failed += 1;
  }
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log(`✔ Soundor builds type-check (${projects.length} projects).`);
}
