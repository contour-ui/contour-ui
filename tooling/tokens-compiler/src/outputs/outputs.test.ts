import { afterAll, describe, expect, it } from 'vite-plus/test';

import { buildTokens } from '../build.ts';
import type { FixtureEdits } from '../test-fixtures/fixture.ts';
import { RESOLVER, removeFixtures, soundor, web, writeFixture } from '../test-fixtures/fixture.ts';
import { css } from './css.ts';
import type { TokenOutput } from './output.ts';
import { values } from './values.ts';
import { vars } from './vars.ts';

afterAll(removeFixtures);

/** The one file an output writes. */
async function written(output: TokenOutput, edits?: FixtureEdits): Promise<string> {
  const build = await buildTokens({ resolver: RESOLVER, outputs: [output] }, writeFixture(edits));
  expect(build.problems).toEqual([]);
  const [artifact] = build.artifacts;
  return artifact?.kind === 'entry' ? artifact.code : (artifact?.source ?? '');
}

describe('css', () => {
  it('declares the default theme on :root and redeclares only what another theme changes', async () => {
    const text = await written(css(web, { file: 'tokens.css' }));
    const [, light] = text.split('[data-theme="light"] {');
    expect(text).toContain(':root,\n[data-theme="dark"] {\n  color-scheme: dark;\n');
    expect(text).toContain('  --x-color-bg-surface: var(--x-base-color-gray-900);\n');
    expect(light).toBe(
      [
        '',
        '  color-scheme: light;',
        '  --x-color-bg-surface: var(--x-base-color-gray-100);',
        '  --x-color-fg-default: var(--x-base-color-gray-900);',
        '  --x-color-overlay-scrim: oklch(0.28 0.008 255 / 0.4);',
        '}',
        '',
      ].join('\n'),
    );
  });

  it('writes a text style as a font shorthand and one property per sub-value', async () => {
    const text = await written(css(web, { file: 'tokens.css' }));
    expect(text).toContain(
      '  --x-text-label: var(--x-text-label-font-weight) var(--x-text-label-font-size)/var(--x-text-label-line-height) var(--x-text-label-font-family);\n',
    );
    expect(text).toContain('  --x-text-label-font-family: var(--x-base-font-family-ui);\n');
    expect(text).toContain('  --x-base-font-family-ui: "IBM Plex Sans", sans-serif;\n');
    expect(text).toContain(
      '  --x-motion-feedback: var(--x-base-duration-80) var(--x-base-easing-out) 0ms;\n',
    );
    expect(text).toContain('  --x-shadow-raised: 0px 2px 4px 0px var(--x-base-color-gray-900);\n');
  });
});

describe('vars', () => {
  it('references the semantic tokens with their descriptions, and names the themes', async () => {
    const code = await written(vars(web, { entry: 'index' }));
    expect(code).toContain(
      [
        '    bg: {',
        '      /** Panels. */',
        "      surface: 'var(--x-color-bg-surface)',",
        '    },',
      ].join('\n'),
    );
    expect(code).toContain("      font: 'var(--x-text-label)',\n");
    expect(code).not.toContain('--x-base-');
    expect(code).toContain("export const themes = ['dark', 'light'] as const;");
    expect(code).toContain("export const themeAttribute = 'data-theme';");
  });
});

describe('values for soundor', () => {
  it('holds hex colors, numbers and Soundor styles per theme, without shadows', async () => {
    const code = await written(values(soundor, { entry: 'soundor', name: 'soundorTokens' }));
    expect(code).toContain('export interface SoundorTokens {');
    expect(code).toContain(
      "export const soundorTokens: Readonly<Record<'dark' | 'light', SoundorTokens>> = {",
    );
    expect(code).toContain("        scrim: '#26292d99',\n");
    expect(code).toContain("        scrim: '#26292d66',\n");
    expect(code).toContain(
      "      label: { fontFamily: 'IBM Plex Sans', fontSize: 12, fontWeight: 500, lineHeight: 15, letterSpacing: 0 },\n",
    );
    expect(code).toContain("      feedback: { duration: 80, easing: 'ease-out', delay: 0 },\n");
    expect(code).not.toContain('shadow');
  });

  it('reports a value Soundor cannot take, with its token', async () => {
    const build = await buildTokens(
      {
        resolver: RESOLVER,
        outputs: [values(soundor, { entry: 'soundor', name: 'soundorTokens' })],
      },
      writeFixture({ semantic: { 'space.gap': { $value: { value: 0.25, unit: 'rem' } } } }),
    );
    expect(build.artifacts).toEqual([]);
    expect(build.problems).toContainEqual({
      source: 'values(soundor): soundor',
      token: 'space.gap',
      theme: 'dark',
      message: 'space.gap: expected px, got rem.',
    });
  });
});
