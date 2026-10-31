import { afterAll, describe, expect, it } from 'vite-plus/test';

import { buildTokens } from '../build.ts';
import type { TokenBuild } from '../build.ts';
import { valueIn } from '../model/model.ts';
import type { ModelToken } from '../model/model.ts';
import type { FixtureEdits } from '../test-fixtures/fixture.ts';
import { RESOLVER, removeFixtures, writeFixture } from '../test-fixtures/fixture.ts';

afterAll(removeFixtures);

const build = (edits?: FixtureEdits): Promise<TokenBuild> =>
  buildTokens({ resolver: RESOLVER, outputs: [] }, writeFixture(edits));

/** A token of a build's model; throws when there is none. */
function tokenOf({ model }: TokenBuild, id: string): ModelToken {
  const token = model?.token(id);
  if (token === undefined) {
    throw new Error(`no token ${id}`);
  }
  return token;
}

describe('the model', () => {
  it('holds every token with its tier, type and description', async () => {
    const { model, problems } = await build();
    expect(problems).toEqual([]);
    expect(model?.themes).toEqual(['dark', 'light']);
    expect(model?.defaultTheme).toBe('dark');
    expect(model?.token('base.space.4')).toMatchObject({ tier: 'base', type: 'dimension' });
    expect(model?.token('color.bg.surface')).toMatchObject({
      tier: 'semantic',
      type: 'color',
      description: 'Panels.',
    });
  });

  it('keeps the value as written beside the resolved one, in each theme', async () => {
    const surface = tokenOf(await build(), 'color.bg.surface');
    expect(valueIn(surface, 'dark')).toEqual({
      authored: '{base.color.gray.900}',
      value: { colorSpace: 'oklch', components: [0.28, 0.008, 255] },
    });
    expect(valueIn(surface, 'light').authored).toBe('{base.color.gray.100}');
  });

  it('lists every file it read', async () => {
    const { files } = await build();
    expect(files.map((file) => file.split('/').at(-1))).toEqual([
      'tokens.resolver.json',
      'base.tokens.json',
      'semantic.tokens.json',
      'theme.dark.tokens.json',
      'theme.light.tokens.json',
    ]);
  });
});

describe('built-in checks', () => {
  it('name the token and the theme of an alias that points at no token', async () => {
    const { model, problems } = await build({
      dark: { 'color.fg.default': { $value: '{base.color.gray.500}' } },
    });
    expect(model).toBeUndefined();
    expect(problems).toEqual([
      {
        source: 'model',
        token: 'color.fg.default',
        theme: 'dark',
        message: '{base.color.gray.500} does not resolve.',
      },
    ]);
  });

  it('name an alias broken in every theme once', async () => {
    const { problems } = await build({ semantic: { 'space.gap': { $value: '{base.space.5}' } } });
    expect(problems).toEqual([
      { source: 'model', token: 'space.gap', message: '{base.space.5} does not resolve.' },
    ]);
  });

  it('report a token missing in a theme', async () => {
    const { problems } = await build({
      dark: { 'color.fg.muted': { $value: '{base.color.gray.100}' } },
    });
    expect(problems).toEqual([
      {
        source: 'model',
        token: 'color.fg.muted',
        theme: 'light',
        message: 'is missing in this theme.',
      },
    ]);
  });

  it('report a description that differs between themes', async () => {
    const { problems } = await build({
      dark: { 'color.bg.surface': { $value: '{base.color.gray.900}', $description: 'Cards.' } },
    });
    expect(problems).toEqual([
      {
        source: 'model',
        token: 'color.bg.surface',
        theme: 'light',
        message: '$description differs from the dark theme.',
      },
    ]);
  });

  it('report a name that is not kebab-case', async () => {
    const { problems } = await build({
      semantic: { 'space.groupGap': { $value: '{base.space.4}' } },
    });
    expect(problems).toEqual([
      { source: 'model', token: 'space.groupGap', message: '"groupGap" is not a kebab-case name.' },
    ]);
  });
});
