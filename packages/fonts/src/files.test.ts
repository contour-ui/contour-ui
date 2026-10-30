/**
 * The font files are committed (written by `vp run --filter @contour-ui/fonts fonts`, which needs
 * the network). These tests check, offline, that they are the pinned ones and that `fonts.css`,
 * the manifest and the files agree.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import {
  CSS_FILE,
  FACES_FILE,
  LICENSES_DIR,
  PACKAGE_DIR,
  TTF_DIR,
  WOFF2_DIR,
  facesModule,
  licenseName,
} from '../scripts/build-fonts.ts';
import { SOURCES, WEIGHTS, ttfName } from '../scripts/sources.ts';
import { fontFaces } from './index.ts';

const css = readFileSync(CSS_FILE, 'utf8');

/** The `@font-face` rules of `fonts.css`: family, weight and file of each. */
const webFaces = [
  ...css.matchAll(
    /font-family: '(?<family>[^']+)';[^}]*font-weight: (?<weight>\d+);\s*src: url\('\.\/(?<file>[^']+)'\)/gu,
  ),
].map(({ groups }) => ({
  family: groups?.['family'],
  weight: Number(groups?.['weight']),
  file: groups?.['file'] ?? '',
}));

describe('generated manifest (if stale: vp run --filter @contour-ui/fonts fonts)', () => {
  it('src/generated/faces.ts', () => {
    expect(readFileSync(FACES_FILE, 'utf8')).toBe(facesModule());
  });
});

describe('TTF files', () => {
  it('are the pinned files, one per family and weight', () => {
    const files = SOURCES.flatMap((source) =>
      WEIGHTS.map((weight) => {
        const name = ttfName(source, weight);
        const hash = createHash('sha256')
          .update(readFileSync(path.join(TTF_DIR, name)))
          .digest('hex');
        return { name, hash, pinned: source.ttf[weight] };
      }),
    );

    expect(readdirSync(TTF_DIR).toSorted()).toEqual(files.map(({ name }) => name).toSorted());
    expect(files.filter(({ hash, pinned }) => hash !== pinned)).toEqual([]);
  });

  it('are listed in fontFaces', () => {
    expect(fontFaces.map(({ file }) => file).toSorted()).toEqual(
      readdirSync(TTF_DIR)
        .map((name) => `ttf/${name}`)
        .toSorted(),
    );
  });
});

describe('fonts.css', () => {
  it('declares every WOFF2 file once, and nothing else', () => {
    expect(webFaces.map(({ file }) => file).toSorted()).toEqual(
      readdirSync(WOFF2_DIR)
        .map((name) => `woff2/${name}`)
        .toSorted(),
    );
  });

  it('has a Latin and a Cyrillic face for every family and weight', () => {
    const expected = SOURCES.flatMap((source) =>
      WEIGHTS.flatMap((weight) =>
        ['latin', 'cyrillic'].map((subset) => ({
          family: source.family,
          weight,
          file: `woff2/${source.id}-${subset}-${weight}-normal.woff2`,
        })),
      ),
    );

    expect(webFaces).toEqual(expect.arrayContaining(expected));
  });
});

describe('licenses', () => {
  it.each(SOURCES)('$family ships its SIL OFL 1.1 license with its copyright notice', (source) => {
    const file = path.join(LICENSES_DIR, licenseName(source));
    const license = readFileSync(file, 'utf8');

    expect(license).toMatch(/^Copyright /u);
    expect(license).toContain('SIL OPEN FONT LICENSE Version 1.1');
  });

  it('README.md names every license file', () => {
    const readme = readFileSync(path.join(PACKAGE_DIR, 'README.md'), 'utf8');
    for (const source of SOURCES) {
      expect(existsSync(path.join(LICENSES_DIR, licenseName(source)))).toBe(true);
      expect(readme).toContain(`licenses/${licenseName(source)}`);
    }
  });
});
