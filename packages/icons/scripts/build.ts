/**
 * Regenerate `src/generated/icons.ts` from `scripts/icon-list.ts` and the icon
 * sources (lucide-static, simple-icons). Run after editing the list:
 *
 *   vp run --filter @contour-ui/icons icons
 *
 * The generated file is committed so apps and tests use the icons from
 * source without a build step; `src/generated.test.ts` fails when it is stale.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { ICONS_FILE, PACKAGE_DIR, buildIcons } from './build-icons.ts';

const source = buildIcons();

mkdirSync(path.dirname(ICONS_FILE), { recursive: true });
writeFileSync(ICONS_FILE, source);

console.log(`wrote ${path.relative(PACKAGE_DIR, ICONS_FILE)}`);
