import { describe, expect, it } from 'vite-plus/test';

import docs from './generated/docs.json' with { type: 'json' };
import { defaultTheme } from './index.ts';

import './fonts.css';

/** The values of the tokens below `prefix`, in the default theme, from the token data. */
function valuesOf(prefix: string): string[] {
  return docs.tokens
    .filter(({ token }) => token.startsWith(prefix))
    .map(({ themes }) => themes[defaultTheme].value);
}

describe('fonts.css', () => {
  it('has a face for every font family and weight of the tokens', async () => {
    const fonts = valuesOf('base.font-family.').flatMap((family) =>
      valuesOf('base.font-weight.').map((weight) => ({ font: `${weight} 13px ${family}`, weight })),
    );
    const loaded = await Promise.all(
      fonts.map(async ({ font, weight }) => ({
        font,
        found: (await document.fonts.load(font, 'Gain')).some((face) => face.weight === weight),
      })),
    );

    expect(fonts).toHaveLength(6);
    expect(loaded.filter(({ found }) => !found).map(({ font }) => font)).toEqual([]);
  });
});
