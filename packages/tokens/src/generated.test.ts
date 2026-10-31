/**
 * Generated files are committed (so consumers need no build step). These tests
 * fail when a generated file no longer matches its source.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vite-plus/test';

import { buildSoundorTokens } from '../scripts/build-soundor.ts';
import { buildTokens } from '../scripts/build-tokens.ts';
import { CSS_FILE, DOCS_FILE, SOUNDOR_FILE, TS_FILE } from '../scripts/paths.ts';

const { css, ts, docs } = await buildTokens();
const soundor = await buildSoundorTokens();

describe('Style Dictionary outputs (if stale: vp run --filter @contour-ui/tokens tokens)', () => {
  it('src/generated/tokens.css', () => {
    expect(readFileSync(CSS_FILE, 'utf8')).toBe(css);
  });

  it('src/generated/vars.ts', () => {
    expect(readFileSync(TS_FILE, 'utf8')).toBe(ts);
  });

  it('src/generated/docs.json', () => {
    expect(readFileSync(DOCS_FILE, 'utf8')).toBe(docs);
  });

  it('src/generated/soundor.ts', () => {
    expect(readFileSync(SOUNDOR_FILE, 'utf8')).toBe(soundor);
  });
});
