/**
 * `src/generated/icons.ts` is committed (so consumers need no build step). These
 * tests fail when it no longer matches the icon list and the installed sources, or
 * when the Lucide license in README.md no longer matches lucide-static.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { ICONS_FILE, PACKAGE_DIR, buildIcons } from '../scripts/build-icons.ts';

describe('generated icon data (if stale: vp run --filter @contour-ui/icons icons)', () => {
  it('src/generated/icons.ts', () => {
    expect(readFileSync(ICONS_FILE, 'utf8')).toBe(buildIcons());
  });
});

describe('Lucide license', () => {
  it('README.md carries the Lucide license of the installed lucide-static', () => {
    const license = readFileSync(
      createRequire(import.meta.url).resolve('lucide-static/LICENSE'),
      'utf8',
    );
    const readme = readFileSync(path.join(PACKAGE_DIR, 'README.md'), 'utf8');
    expect(readme).toContain(license.trim());
  });
});
