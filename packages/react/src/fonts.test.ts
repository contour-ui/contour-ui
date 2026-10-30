/**
 * The type tokens name the font families and weights; `@contour-ui/fonts` holds their files.
 * The styled package uses both, so it checks here that every family × weight of the tokens has a
 * TTF face (Soundor) and a web face (`fonts.css`).
 */
import { fontFaces } from '@contour-ui/fonts';
import { defaultTheme } from '@contour-ui/tokens';
import docs from '@contour-ui/tokens/docs.json' with { type: 'json' };
import { describe, expect, it } from 'vite-plus/test';

import '@contour-ui/fonts/fonts.css';

/** The values of the tokens below `prefix`, in the default theme. */
function valuesOf(prefix: string): string[] {
  return docs.tokens
    .filter(({ token }) => token.startsWith(prefix))
    .map(({ themes }) => themes[defaultTheme].value);
}

/** The first family of a font stack: `'IBM Plex Sans', system-ui, …` → `IBM Plex Sans`. */
const firstFamily = (stack: string): string =>
  (stack.split(',')[0] ?? '').trim().replaceAll(/^["']|["']$/gu, '');

const fonts = valuesOf('base.font-family.').flatMap((stack) =>
  valuesOf('base.font-weight.').map((weight) => ({
    stack,
    family: firstFamily(stack),
    weight: Number(weight),
  })),
);

describe('fonts of the type tokens', () => {
  it('has a TTF face for every font family and weight', () => {
    expect(fonts).toHaveLength(6);
    expect(fontFaces.map(({ family, weight }) => ({ family, weight }))).toEqual(
      expect.arrayContaining(fonts.map(({ family, weight }) => ({ family, weight }))),
    );
  });

  it('loads a web face for every font family and weight', async () => {
    const loaded = await Promise.all(
      fonts.map(async ({ stack, weight }) => {
        const font = `${weight} 13px ${stack}`;
        const faces = await document.fonts.load(font, 'Gain');
        return { font, found: faces.some((face) => face.weight === String(weight)) };
      }),
    );

    expect(loaded.filter(({ found }) => !found).map(({ font }) => font)).toEqual([]);
  });
});
