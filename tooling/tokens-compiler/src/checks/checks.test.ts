import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vite-plus/test';

import { buildTokens } from '../build.ts';
import type { FixtureEdits } from '../test-fixtures/fixture.ts';
import { RESOLVER, removeFixtures, writeFixture } from '../test-fixtures/fixture.ts';
import type { TokenCheck } from './check.ts';
import { contrast } from './contrast.ts';
import { described } from './described.ts';
import { gamut } from './gamut.ts';
import { paletteSteps } from './palette-steps.ts';

afterAll(removeFixtures);

async function problemsOf(check: TokenCheck, edits?: FixtureEdits, pairs?: unknown) {
  const directory = writeFixture(edits);
  if (pairs !== undefined) {
    writeFileSync(path.join(directory, 'contrast.json'), JSON.stringify({ pairs }));
  }
  const build = await buildTokens({ resolver: RESOLVER, outputs: [], checks: [check] }, directory);
  return build.problems;
}

const pair = (foreground: string, background: string, minimum: number) => ({
  foreground,
  background,
  minimum,
});

describe('contrast', () => {
  it('passes the pairs that meet their ratio in every theme', async () => {
    const pairs = [pair('color.fg.default', 'color.bg.surface', 7)];
    expect(await problemsOf(contrast('contrast.json'), {}, pairs)).toEqual([]);
  });

  it('reports a pair below its ratio, with the ratio it has', async () => {
    const pairs = [pair('color.fg.default', 'color.bg.surface', 12)];
    expect(await problemsOf(contrast('contrast.json'), {}, pairs)).toEqual([
      {
        source: 'contrast',
        token: 'color.fg.default',
        theme: 'dark',
        message: '11.87:1 on color.bg.surface, below 12:1.',
      },
      {
        source: 'contrast',
        token: 'color.fg.default',
        theme: 'light',
        message: '11.87:1 on color.bg.surface, below 12:1.',
      },
    ]);
  });

  it('measures every color of a group for a foreground ending in .*', async () => {
    const edits = {
      dark: { 'color.fg.muted': { $value: '{base.color.gray.900}' } },
      light: { 'color.fg.muted': { $value: '{base.color.gray.100}' } },
    };
    const problems = await problemsOf(contrast('contrast.json'), edits, [
      pair('color.fg.*', 'color.bg.surface', 4.5),
    ]);
    expect(problems.map(({ token, theme }) => `${token} ${theme}`)).toEqual([
      'color.fg.muted dark',
      'color.fg.muted light',
    ]);
  });

  it('composites a translucent foreground over its background', async () => {
    const problems = await problemsOf(contrast('contrast.json'), {}, [
      pair('color.overlay.scrim', 'color.bg.surface', 1.1),
    ]);
    expect(problems.map(({ theme, message }) => `${theme}: ${message}`)).toEqual([
      'dark: 1.00:1 on color.bg.surface, below 1.1:1.',
    ]);
  });

  it('reports a pair whose token does not exist', async () => {
    expect(
      await problemsOf(contrast('contrast.json'), {}, [
        pair('color.fg.missing', 'color.bg.surface', 3),
      ]),
    ).toEqual([{ source: 'contrast', message: 'color.fg.missing: no such color token.' }]);
  });
});

describe('gamut', () => {
  it('reports a color outside sRGB, inside a composite too', async () => {
    const outside = { colorSpace: 'oklch', components: [0.7, 0.4, 150] };
    const problems = await problemsOf(gamut('srgb'), {
      base: { 'base.color.blue.900': { $value: outside } },
    });
    expect(problems).toContainEqual({
      source: 'gamut(srgb)',
      token: 'base.color.blue.900',
      theme: 'dark',
      message: 'base.color.blue.900: oklch(0.7 0.4 150) is outside sRGB.',
    });
  });
});

describe('paletteSteps', () => {
  it('passes stops within the tolerance and reports a step that drifts apart', async () => {
    expect(await problemsOf(paletteSteps('base.color'))).toEqual([]);
    const problems = await problemsOf(paletteSteps('base.color'), {
      base: {
        'base.color.blue.100': { $value: { colorSpace: 'oklch', components: [0.85, 0.03, 255] } },
      },
    });
    expect(problems).toEqual([
      {
        source: 'paletteSteps(base.color)',
        token: 'base.color.blue.100',
        message: 'stop 100: lightness 0.85, base.color.gray.100 0.93; they may differ by 0.02.',
      },
    ]);
  });
});

describe('described', () => {
  it('reports the tokens of a tier without a description', async () => {
    const problems = await problemsOf(described(['semantic']));
    expect(problems.map(({ token }) => token)).toEqual([
      'motion.feedback',
      'color.fg.default',
      'color.overlay.scrim',
      'shadow.raised',
    ]);
  });
});
