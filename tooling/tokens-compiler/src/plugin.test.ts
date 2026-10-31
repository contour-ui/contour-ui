import { describe, expect, it } from 'vite-plus/test';

import { formatProblems } from './model/problem.ts';
import { css } from './outputs/css.ts';
import { values } from './outputs/values.ts';
import { vars } from './outputs/vars.ts';
import { designTokens } from './plugin.ts';
import { soundor, web } from './test-fixtures/fixture.ts';

describe('designTokens', () => {
  it('adds the entries of its outputs as generated modules', async () => {
    const plugin = designTokens({
      resolver: './tokens.resolver.json',
      outputs: [
        css(web, { file: 'tokens.css' }),
        vars(web, { entry: 'index' }),
        values(soundor, { entry: 'soundor', name: 'soundorTokens' }),
      ],
    });
    const config = await plugin.tsdownConfig?.({}, {});
    expect(config).toEqual({
      entry: { index: '\0design-tokens:index.ts', soundor: '\0design-tokens:soundor.ts' },
    });
  });

  it('refuses two outputs with the same entry', () => {
    expect(() =>
      designTokens({
        resolver: './tokens.resolver.json',
        outputs: [vars(web, { entry: 'index' }), vars(web, { entry: 'index' })],
      }),
    ).toThrow('designTokens: entries added twice: index.');
  });
});

describe('formatProblems', () => {
  it('lists every problem with its token and theme', () => {
    expect(
      formatProblems([
        {
          source: 'contrast',
          token: 'color.fg.subtle',
          theme: 'light',
          message: '2.90:1 on color.bg.surface, below 3:1.',
        },
        { source: 'outputs', message: 'docs.json is also written by docs(docs.json).' },
      ]),
    ).toBe(
      [
        'design tokens: 2 problems',
        '  contrast: color.fg.subtle (light): 2.90:1 on color.bg.surface, below 3:1.',
        '  outputs: docs.json is also written by docs(docs.json).',
      ].join('\n'),
    );
  });
});
