/**
 * A small token set in a temporary directory: a palette, a few scales, a text style, a transition,
 * and per theme two color roles, a translucent color and a shadow. Edits set or remove tokens
 * before the files are written, for the cases a test needs.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { isRecord } from '../model/dtcg.ts';
import { soundorPlatform } from '../platforms/soundor.ts';
import { webPlatform } from '../platforms/web.ts';

export type Json = Record<string, unknown>;

const oklch = (l: number, c: number, h: number, alpha?: number): Json => ({
  colorSpace: 'oklch',
  components: [l, c, h],
  ...(alpha === undefined ? {} : { alpha }),
});

const px = (value: number): Json => ({ value, unit: 'px' });

const theme = (surface: string, text: string, scrim: number): Json => ({
  color: {
    $type: 'color',
    bg: { surface: { $value: `{base.color.gray.${surface}}`, $description: 'Panels.' } },
    fg: { default: { $value: `{base.color.gray.${text}}` } },
    overlay: { scrim: { $value: oklch(0.28, 0.008, 255, scrim) } },
  },
  shadow: {
    $type: 'shadow',
    raised: {
      $value: {
        offsetX: px(0),
        offsetY: px(2),
        blur: px(4),
        spread: px(0),
        color: '{base.color.gray.900}',
      },
    },
  },
});

export function fixtureFiles(): Record<string, Json> {
  return {
    'tokens.resolver.json': {
      name: 'Fixture',
      sets: {
        base: { sources: [{ $ref: 'base.tokens.json' }] },
        semantic: { sources: [{ $ref: 'semantic.tokens.json' }] },
      },
      modifiers: {
        theme: {
          contexts: {
            dark: [{ $ref: 'theme.dark.tokens.json' }],
            light: [{ $ref: 'theme.light.tokens.json' }],
          },
          default: 'dark',
        },
      },
      resolutionOrder: [
        { $ref: '#/sets/base' },
        { $ref: '#/sets/semantic' },
        { $ref: '#/modifiers/theme' },
      ],
    },
    'base.tokens.json': {
      base: {
        color: {
          $type: 'color',
          gray: {
            100: { $value: oklch(0.93, 0.008, 255) },
            900: { $value: oklch(0.28, 0.008, 255) },
          },
          blue: {
            100: { $value: oklch(0.925, 0.03, 255) },
            900: { $value: oklch(0.28, 0.08, 255) },
          },
        },
        space: { $type: 'dimension', 4: { $value: px(4) } },
        'font-family': { $type: 'fontFamily', ui: { $value: ['IBM Plex Sans', 'sans-serif'] } },
        easing: { $type: 'cubicBezier', out: { $value: [0, 0, 0.2, 1] } },
        duration: { $type: 'duration', 80: { $value: { value: 80, unit: 'ms' } } },
      },
    },
    'semantic.tokens.json': {
      space: {
        $type: 'dimension',
        gap: { $value: '{base.space.4}', $description: 'Gap between controls.' },
      },
      text: {
        $type: 'typography',
        label: {
          $value: {
            fontFamily: '{base.font-family.ui}',
            fontSize: px(12),
            fontWeight: 500,
            lineHeight: 1.25,
            letterSpacing: px(0),
          },
          $description: 'Control labels.',
        },
      },
      motion: {
        $type: 'transition',
        feedback: {
          $value: {
            duration: '{base.duration.80}',
            timingFunction: '{base.easing.out}',
            delay: { value: 0, unit: 'ms' },
          },
        },
      },
    },
    'theme.dark.tokens.json': theme('900', '100', 0.6),
    'theme.light.tokens.json': theme('100', '900', 0.4),
  };
}

/** Tokens to set (or, with `undefined`, remove) in a file of the fixture, by id. */
export type TokenEdits = Readonly<Record<string, Json | undefined>>;

export interface FixtureEdits {
  readonly base?: TokenEdits;
  readonly semantic?: TokenEdits;
  readonly dark?: TokenEdits;
  readonly light?: TokenEdits;
}

const FILES: Readonly<Record<keyof FixtureEdits, string>> = {
  base: 'base.tokens.json',
  semantic: 'semantic.tokens.json',
  dark: 'theme.dark.tokens.json',
  light: 'theme.light.tokens.json',
};

function setToken(document: Json, id: string, token: Json | undefined): void {
  const segments = id.split('.');
  const key = segments.pop() ?? id;
  let group = document;
  for (const segment of segments) {
    const child = group[segment];
    const next: Json = isRecord(child) ? child : {};
    group[segment] = next;
    group = next;
  }
  if (token === undefined) {
    delete group[key];
  } else {
    group[key] = token;
  }
}

const directories: string[] = [];

/** Write the fixture, with `edits`, to a new temporary directory; returns the directory. */
export function writeFixture(edits: FixtureEdits = {}): string {
  const files = fixtureFiles();
  for (const name of ['base', 'semantic', 'dark', 'light'] as const) {
    const document = files[FILES[name]] ?? {};
    for (const [id, token] of Object.entries(edits[name] ?? {})) {
      setToken(document, id, token);
    }
  }
  const directory = mkdtempSync(path.join(tmpdir(), 'tokens-compiler-'));
  directories.push(directory);
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(directory, name), `${JSON.stringify(content, null, 2)}\n`);
  }
  return directory;
}

/** Remove every directory `writeFixture` made. */
export function removeFixtures(): void {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
}

export const RESOLVER = './tokens.resolver.json';

export const web = webPlatform({ prefix: 'x', themeAttribute: 'data-theme' });

export const soundor = soundorPlatform({ easing: { 'base.easing.out': 'ease-out' } });
