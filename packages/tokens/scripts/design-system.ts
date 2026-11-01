/**
 * Export the tokens as the list-shaped `tokens.json` the Design System page reads: names are the
 * CSS custom properties without the leading `--`, values as CSS, usage the tokens' descriptions.
 * Built from the same model as the package, so it never resolves the sources on its own.
 *
 *   vp run --filter @contour-ui/tokens design-system <out-dir>
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { buildTokens, formatProblems, webPlatform } from '@contour-ui/tokens-compiler';
import type { ModelToken, TokenModel } from '@contour-ui/tokens-compiler';

const [outDir] = process.argv.slice(2);
if (outDir === undefined) {
  throw new Error('Usage: node scripts/design-system.ts <out-dir>');
}

const web = webPlatform({ prefix: 'ct', themeAttribute: 'data-theme' });
const build = await buildTokens(
  { resolver: './contour.resolver.json', contrast: './contrast.json', outputs: [] },
  path.resolve(import.meta.dirname, '..'),
);
if (build.model === undefined || build.problems.length > 0) {
  throw new Error(formatProblems(build.problems));
}
const model: TokenModel = build.model;

const name = (tokenPath: readonly string[]): string => web.variable(tokenPath).slice(2);

/** The value of a token in a theme as DTCG data, aliases resolved, and as written. */
function valuesOf(
  token: ModelToken,
  theme: string = model.defaultTheme,
): { value: unknown; authored: unknown } {
  const themed = token.themes[theme];
  if (themed === undefined) {
    throw new Error(`${token.id}: no value in the ${theme} theme.`);
  }
  return themed;
}

/** `{base.color.neutral.950}` -> `['base', 'color', 'neutral', '950']`. */
const aliasOf = (value: unknown): string[] | undefined =>
  typeof value === 'string' ? /^\{([^{}]+)\}$/u.exec(value)?.[1]?.split('.') : undefined;

/** The tokens one level below `group`, such as the stops of `base.space`. */
const tokensOf = (group: string): ModelToken[] => {
  const prefix = group.split('.');
  return model.tokens.filter(
    (token) =>
      token.path.length === prefix.length + 1 &&
      prefix.every((segment, index) => token.path[index] === segment),
  );
};

const tokenAt = (id: string): ModelToken => {
  const token = model.token(id);
  if (token === undefined) {
    throw new Error(`no token ${id}`);
  }
  return token;
};

const keyOf = (token: ModelToken): string => token.path.at(-1) ?? token.id;

/** A dimension or a duration as CSS: `6px`, `80ms`. */
function cssAmount(value: unknown, what: string): string {
  if (typeof value !== 'object' || value === null || !('value' in value) || !('unit' in value)) {
    throw new TypeError(`${what}: expected { value, unit }.`);
  }
  return `${String(value.value)}${String(value.unit)}`;
}

/** ` 4.5:1 on bg.surface and bg.raised.`: the contrast targets of a color role, from `contrast.json`. */
function contrastNote(token: ModelToken): string {
  const byMinimum = new Map<number, string[]>();
  for (const { foreground, background, minimum } of model.contrast) {
    if (foreground !== token.id || minimum === undefined) {
      continue;
    }
    byMinimum.set(minimum, [
      ...(byMinimum.get(minimum) ?? []),
      background.replace(/^color\./u, ''),
    ]);
  }
  const notes = [...byMinimum].map(([minimum, backgrounds]) => {
    const last = backgrounds.pop();
    const listed =
      backgrounds.length > 0 ? `${backgrounds.join(', ')} and ${String(last)}` : String(last);
    return `${minimum}:1 on ${listed}`;
  });
  return notes.length > 0 ? ` ${notes.join('; ')}.` : '';
}

interface ListedToken {
  readonly name: string;
  readonly value: unknown;
  readonly usage: string | undefined;
}

function list(group: string, usage: (token: ModelToken) => string | undefined): ListedToken[] {
  return tokensOf(group).map((token) => ({
    name: name(token.path),
    value: web.resolved(token, model.defaultTheme),
    usage: usage(token),
  }));
}

// Colors: base palette as plain values, roles as per-theme aliases or translucent colors.
const colorTokens: ListedToken[] = [];
for (const token of model.tokens) {
  const [tier, group, hue, stop] = token.path;
  if (token.type !== 'color') {
    continue;
  }
  if (tier === 'base' && group === 'color') {
    colorTokens.push({
      name: name(token.path),
      value: web.resolved(token, model.defaultTheme),
      usage: `Base palette, ${String(hue)} ${String(stop)}. Not for direct use in components; reference through a semantic role.`,
    });
    continue;
  }
  const role = (theme: string): string => {
    const { authored } = valuesOf(token, theme);
    const alias = aliasOf(authored);
    return alias === undefined ? web.resolved(token, theme) : `{${name(alias)}}`;
  };
  const syntax = token.path[1] === 'syntax';
  const description = syntax
    ? `${token.description === undefined ? '' : `${token.description} `}Shiki css-variables theme: --shiki-token-${keyOf(token)}.`
    : (token.description ?? '');
  colorTokens.push({
    name: name(token.path),
    value: Object.fromEntries(model.themes.map((theme) => [theme, role(theme)])),
    usage: `${description}${contrastNote(token)}`,
  });
}

function textStyle(style: string, sample: string): Record<string, unknown> {
  const token = tokenAt(`text.${style}`);
  const { value } = valuesOf(token);
  if (typeof value !== 'object' || value === null) {
    throw new TypeError(`text.${style}: expected a text style.`);
  }
  const parts = new Map(Object.entries(value));
  return {
    name: name(token.path),
    fontSize: cssAmount(parts.get('fontSize'), `text.${style}.fontSize`),
    lineHeight: parts.get('lineHeight'),
    fontWeight: parts.get('fontWeight'),
    letterSpacing: cssAmount(parts.get('letterSpacing'), `text.${style}.letterSpacing`),
    sample,
    usage: token.description,
  };
}

const family = (key: string): string =>
  web.resolved(tokenAt(`base.font-family.${key}`), model.defaultTheme);

const tokens = {
  name: 'Contour',
  version: 1,
  meta: {
    source:
      'DTCG 2025.10 files in packages/tokens (contour.resolver.json). This page mirrors them.',
  },
  color: {
    themes: model.themes.map((theme) => ({
      id: theme,
      name: `${theme.charAt(0).toUpperCase()}${theme.slice(1)}`,
    })),
    tokens: colorTokens,
  },
  type: {
    fonts: [],
    families: { ui: family('ui'), mono: family('mono') },
    groups: [
      {
        name: 'Text',
        family: 'ui',
        styles: ['heading', 'body', 'label', 'label-lg', 'caption'].map((style) =>
          textStyle(style, 'Gain'),
        ),
      },
      {
        name: 'Numeric',
        family: 'mono',
        styles: [textStyle('value', '-6.0 dB  1.20 kHz  Q 0.71')],
      },
      {
        name: 'Long-form',
        family: 'ui',
        styles: ['display', 'title', 'subtitle', 'prose'].map((style) =>
          textStyle(style, 'Styling with tokens'),
        ),
      },
      {
        name: 'Code',
        family: 'mono',
        styles: [textStyle('code', "import { vars } from '@contour-ui/tokens';")],
      },
      {
        name: 'Site',
        family: 'ui',
        styles: [
          textStyle('hero', 'A design system for audio interfaces'),
          textStyle('lead', 'Tokens, headless logic and components.'),
          textStyle('nav', 'Docs'),
        ],
      },
    ],
  },
  spacing: {
    tokens: [
      ...list('base.space', (token) => `Base step, ${keyOf(token)}px.`),
      ...list('space', (token) => {
        const target = aliasOf(valuesOf(token).authored)?.join('.') ?? '';
        return `${token.description ?? ''} Resolves to ${target}.`;
      }),
      ...list('base.size', (token) => `Base panel size, ${keyOf(token)}px.`),
      ...list('size', (token) => token.description),
    ],
  },
  radius: {
    tokens: [
      ...list('base.radius', (token) =>
        keyOf(token) === 'full' ? 'Pill and circle shapes.' : `Base radius, ${keyOf(token)}px.`,
      ),
      ...list('radius', (token) => token.description),
    ],
  },
  borderWidth: {
    tokens: [
      ...list('base.border-width', (token) => `Base border width, ${keyOf(token)}px.`),
      ...list('border-width', (token) => token.description),
    ],
  },
  duration: { tokens: list('base.duration', (token) => token.description) },
  easing: { tokens: list('base.easing', (token) => token.description) },
};

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'tokens.json'), `${JSON.stringify(tokens, null, 2)}\n`);
console.log(
  `colors ${colorTokens.length}, spacing ${tokens.spacing.tokens.length}, radius ${tokens.radius.tokens.length}`,
);
