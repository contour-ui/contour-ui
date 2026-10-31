/**
 * Regenerate `src/generated/tokens.css`, `vars.ts`, `docs.json` and `soundor.ts` from the DTCG
 * sources with Style Dictionary. Run after editing any `*.tokens.json`:
 *
 *   vp run --filter @contour-ui/tokens tokens
 *
 * The generated files are committed so apps and tests consume tokens
 * from source without a build step; `src/generated.test.ts` fails when they are stale.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { buildSoundorTokens } from './build-soundor.ts';
import { buildTokens } from './build-tokens.ts';
import { CSS_FILE, DOCS_FILE, PACKAGE_DIR, SOUNDOR_FILE, TS_FILE } from './paths.ts';

const { css, ts, docs } = await buildTokens();
const soundor = await buildSoundorTokens();

mkdirSync(path.dirname(CSS_FILE), { recursive: true });
writeFileSync(CSS_FILE, css);
writeFileSync(TS_FILE, ts);
writeFileSync(DOCS_FILE, docs);
writeFileSync(SOUNDOR_FILE, soundor);

for (const file of [CSS_FILE, TS_FILE, DOCS_FILE, SOUNDOR_FILE]) {
  console.log(`wrote ${path.relative(PACKAGE_DIR, file)}`);
}
