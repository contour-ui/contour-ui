/**
 * Generated files are committed (so consumers need no build step). These tests
 * fail when a generated file no longer matches its source.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vite-plus/test';

import { buildSoundorTokens } from '../scripts/build-soundor.ts';
import { buildTokens } from '../scripts/build-tokens.ts';
import { readJson } from '../scripts/dtcg.ts';
import { generatePalette } from '../scripts/palette.ts';
import {
  CSS_FILE,
  DOCS_FILE,
  PALETTE_FILE,
  SOUNDOR_FILE,
  TS_FILE,
  semanticColorFile,
} from '../scripts/paths.ts';
import { semanticColors } from '../scripts/semantic-colors.ts';
import { themes } from './index.ts';

// Test titles carry the fix, since a failure only shows the diff.
describe('generated DTCG sources (if stale: vp run --filter @contour-ui/tokens generate)', () => {
  it('base palette matches scripts/palette.ts', () => {
    expect(readJson(PALETTE_FILE)).toStrictEqual(generatePalette());
  });

  it.each(themes)('%s color roles match scripts/semantic-colors.ts', (theme) => {
    expect(readJson(semanticColorFile(theme))).toStrictEqual(semanticColors(theme));
  });
});

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
