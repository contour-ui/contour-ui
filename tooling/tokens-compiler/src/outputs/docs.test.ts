import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vite-plus/test';

import { buildTokens } from '../build.ts';
import { isRecord } from '../model/dtcg.ts';
import { formatProblems } from '../model/problem.ts';
import { RESOLVER, removeFixtures, web, writeFixture } from '../test-fixtures/fixture.ts';
import { docs } from './docs.ts';

afterAll(removeFixtures);

/** `docs.json` of the fixture, with contrast pairs when they are given. */
async function docsJson(pairs?: unknown): Promise<unknown> {
  const directory = writeFixture();
  if (pairs !== undefined) {
    writeFileSync(path.join(directory, 'contrast.json'), JSON.stringify({ pairs }));
  }
  const build = await buildTokens(
    {
      resolver: RESOLVER,
      ...(pairs === undefined ? {} : { contrast: 'contrast.json' }),
      outputs: [docs(web, { file: 'docs.json' })],
    },
    directory,
  );
  const [artifact] = build.artifacts;
  if (build.problems.length > 0 || artifact?.kind !== 'asset') {
    throw new Error(formatProblems(build.problems));
  }
  const json: unknown = JSON.parse(artifact.source);
  return json;
}

/** A list of `docs.json`: `tokens` or `contrast`. */
function listOf(json: unknown, key: string): unknown[] {
  const list = isRecord(json) ? json[key] : undefined;
  if (!Array.isArray(list)) {
    throw new TypeError(`expected { ${key}: [...] }`);
  }
  return list;
}

const named = (list: readonly unknown[], name: string): unknown =>
  list.find((item) => isRecord(item) && item['name'] === name);

describe('docs', () => {
  it('lists each property with its value, alias and DTCG value in every theme', async () => {
    const tokens = listOf(await docsJson(), 'tokens');
    expect(tokens).toContainEqual({
      name: '--x-color-bg-surface',
      token: 'color.bg.surface',
      type: 'color',
      part: null,
      description: 'Panels.',
      themes: {
        dark: {
          value: 'oklch(0.28 0.008 255)',
          alias: '--x-base-color-gray-900',
          dtcg: { colorSpace: 'oklch', components: [0.28, 0.008, 255], alpha: 1, hex: '#26292d' },
        },
        light: {
          value: 'oklch(0.93 0.008 255)',
          alias: '--x-base-color-gray-100',
          dtcg: { colorSpace: 'oklch', components: [0.93, 0.008, 255], alpha: 1, hex: '#e4e8ed' },
        },
      },
    });
    expect(named(tokens, '--x-text-label-font-size')).toMatchObject({
      themes: { dark: { value: '12px', alias: null, dtcg: { value: 12, unit: 'px' } } },
    });
    expect(named(tokens, '--x-motion-feedback')).toMatchObject({
      themes: { dark: { dtcg: { timingFunction: [0, 0, 0.2, 1] } } },
    });
  });

  it('lists the contrast pairs with their ratio in every theme', async () => {
    const pairs = [
      { foreground: 'color.fg.default', background: 'color.bg.surface', minimum: 7 },
      { foreground: 'color.overlay.scrim', background: 'color.bg.surface', kind: 'ui' },
    ];
    expect(listOf(await docsJson(pairs), 'contrast')).toEqual([
      {
        foreground: 'color.fg.default',
        background: 'color.bg.surface',
        kind: 'text',
        minimum: 7,
        ratios: { dark: 11.87, light: 11.87 },
      },
      {
        foreground: 'color.overlay.scrim',
        background: 'color.bg.surface',
        kind: 'ui',
        minimum: null,
        ratios: { dark: 1, light: 2.25 },
      },
    ]);
  });

  it('lists no pairs when the build has none', async () => {
    expect(listOf(await docsJson(), 'contrast')).toEqual([]);
  });
});
