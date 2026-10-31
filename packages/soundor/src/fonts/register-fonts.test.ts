import { fontFaces } from '@contour-ui/fonts';
import { soundorTokens } from '@contour-ui/tokens/soundor';
import * as ui from 'soundor:ui';
import { describe, expect, it, vi } from 'vite-plus/test';

import { FACES, registerFonts } from './register-fonts.ts';

describe('registerFonts', () => {
  it('imports every TTF face of @contour-ui/fonts', () => {
    expect(FACES.map(({ family, weight }) => ({ family, weight }))).toEqual(
      fontFaces.map(({ family, weight }) => ({ family, weight })),
    );
  });

  it('covers the family and weight of every text style', () => {
    const registered = new Set(FACES.map(({ family, weight }) => `${family} ${weight}`));
    const missing = Object.entries(soundorTokens.dark.text)
      .map(([name, style]) => [name, `${style.fontFamily} ${style.fontWeight}`] as const)
      .filter(([, face]) => !registered.has(face));
    expect(missing).toEqual([]);
  });

  it('registers each face with its weight, and resolves once all are ready', async () => {
    const register = vi.spyOn(ui, 'registerFont');
    await expect(registerFonts()).resolves.toBeUndefined();
    expect(register.mock.calls).toEqual(
      FACES.map(({ family, weight, source }) => [family, source, { weight }]),
    );
  });
});
