import { describe, expect, it } from 'vite-plus/test';

import { fontFaces } from './index.ts';

import './fonts.css';

describe('fonts.css', () => {
  it.each([
    ['Latin', 'Gain'],
    ['Cyrillic', 'Усиление'],
  ])('loads every face of the manifest for %s text', async (_script, text) => {
    const loaded = await Promise.all(
      fontFaces.map(async ({ family, weight }) => {
        const font = `${weight} 13px '${family}'`;
        const faces = await document.fonts.load(font, text);
        return { font, found: faces.some((face) => face.weight === String(weight)) };
      }),
    );

    expect(loaded.filter(({ found }) => !found).map(({ font }) => font)).toEqual([]);
  });
});
