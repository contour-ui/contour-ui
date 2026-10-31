/**
 * Every token can be expressed in Soundor, the plugin UI runtime of `@contour-ui/soundor`, which
 * reads them from `src/generated/soundor.ts`. Its styles take sRGB colors (hex, `rgb()`),
 * lengths in px and only named easing curves; they cannot evaluate CSS functions.
 * A translucent color keeps its alpha separate (DTCG `alpha`), so it becomes
 * an 8-digit hex there.
 */
import { displayable } from 'culori';
import type { Oklch } from 'culori';
import type { TransformedToken } from 'style-dictionary/types';
import { describe, expect, it } from 'vite-plus/test';

import { NAMED_EASING } from '../scripts/build-soundor.ts';
import { resolvedTokens } from '../scripts/build-tokens.ts';
import { aliasPath, expectRecord, parseColor, parseUnitValue } from '../scripts/dtcg.ts';
import docs from './generated/docs.json' with { type: 'json' };
import { themes } from './index.ts';

/** Shadow sub-values that are lengths. */
const SHADOW_LENGTHS = ['offsetX', 'offsetY', 'blur', 'spread'] as const;

/** Typography sub-values that are lengths; `lineHeight` is a multiplier of the font size. */
const TYPOGRAPHY_LENGTHS = ['fontSize', 'letterSpacing'] as const;

type Entry = readonly [where: string, value: unknown];

const pathOf = (token: TransformedToken): string => token.path.join('.');

const valueOf = (token: TransformedToken): unknown => {
  const value: unknown = token.$value;
  return value;
};

/** Layers of a resolved shadow value: one object or a list of them. */
const shadowLayers = (
  token: TransformedToken,
): Array<readonly [string, Record<string, unknown>]> => {
  const value = valueOf(token);
  const layers: unknown[] = Array.isArray(value) ? value.flat() : [value];
  return layers.map((layer, index) => {
    const where = `${pathOf(token)}[${index}]`;
    return [where, expectRecord(layer, where)];
  });
};

function colorsOf(token: TransformedToken): Entry[] {
  switch (token.$type ?? '') {
    case 'color': {
      return [[pathOf(token), valueOf(token)]];
    }
    case 'shadow': {
      return shadowLayers(token).map(([where, layer]) => [`${where}.color`, layer['color']]);
    }
    default: {
      return [];
    }
  }
}

function lengthsOf(token: TransformedToken): Entry[] {
  switch (token.$type ?? '') {
    case 'dimension': {
      return [[pathOf(token), valueOf(token)]];
    }
    case 'typography': {
      const parts = expectRecord(valueOf(token), pathOf(token));
      return TYPOGRAPHY_LENGTHS.flatMap((key): Entry[] =>
        parts[key] === undefined ? [] : [[`${pathOf(token)}.${key}`, parts[key]]],
      );
    }
    case 'shadow': {
      return shadowLayers(token).flatMap(([where, layer]) =>
        SHADOW_LENGTHS.map((key): Entry => [`${where}.${key}`, layer[key]]),
      );
    }
    default: {
      return [];
    }
  }
}

/** Why a DTCG color cannot become a hex color as is, or `undefined` when it can. */
function colorProblem(where: string, value: unknown): string | undefined {
  const { colorSpace, components, alpha } = parseColor(value, where);
  if (colorSpace !== 'oklch') {
    return `${where}: ${colorSpace} is not converted (only oklch).`;
  }
  // `none` behaves as 0 when a color is converted.
  const [l = 0, c = 0, h = 0] = components.map((component) =>
    component === 'none' ? 0 : component,
  );
  const color: Oklch = { mode: 'oklch', l, c, h };
  if (!displayable(color)) {
    return `${where}: oklch(${l} ${c} ${h}) is outside sRGB.`;
  }
  if (alpha < 0 || alpha > 1) {
    return `${where}: alpha ${alpha} is not between 0 and 1.`;
  }
  return undefined;
}

function easingProblems(tokens: readonly TransformedToken[]): string[] {
  const curves = new Set(
    tokens.filter((token) => token.$type === 'cubicBezier').map((token) => pathOf(token)),
  );
  return tokens.flatMap((token) => {
    const path = pathOf(token);
    if (token.$type === 'cubicBezier') {
      return NAMED_EASING[path] === undefined ? [`${path}: no named equivalent.`] : [];
    }
    if (token.$type !== 'transition') {
      return [];
    }
    const original: unknown = token.original.$value;
    if (aliasPath(original) !== undefined) {
      // An alias of another transition, which is checked itself.
      return [];
    }
    const timing = aliasPath(expectRecord(original, path)['timingFunction'])?.join('.');
    return timing !== undefined && curves.has(timing)
      ? []
      : [`${path}: timingFunction must reference an easing token.`];
  });
}

const themeTokens = await Promise.all(
  themes.map(async (theme) => [theme, await resolvedTokens(theme)] as const),
);

describe.each(themeTokens)('%s theme', (_theme, tokens) => {
  it('every color is inside sRGB, so it converts to hex without clipping', () => {
    const problems = tokens
      .flatMap((token) => colorsOf(token))
      .map(([where, value]) => colorProblem(where, value))
      .filter((problem) => problem !== undefined);
    expect(problems).toEqual([]);
  });

  it('every length is in px', () => {
    const problems = tokens
      .flatMap((token) => lengthsOf(token))
      .map(([where, value]) => [where, parseUnitValue(value, where).unit] as const)
      .filter(([, unit]) => unit !== 'px')
      .map(([where, unit]) => `${where}: ${unit}`);
    expect(problems).toEqual([]);
  });

  it('every easing curve has a named equivalent', () => {
    expect(easingProblems(tokens)).toEqual([]);
  });
});

it('no value needs CSS to compute it: no calc() or color-mix()', () => {
  const computed = docs.tokens
    .flatMap((doc) =>
      themes.map((theme) => [`${doc.name} (${theme})`, doc.themes[theme].value] as const),
    )
    .filter(([, value]) => /\b(?:calc|color-mix)\(/u.test(value))
    .map(([where]) => where);
  expect(computed).toEqual([]);
});
