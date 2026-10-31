import plexSans400 from '@contour-ui/fonts/ttf/ibm-plex-sans-latin-400-normal.ttf';
import plexSans500 from '@contour-ui/fonts/ttf/ibm-plex-sans-latin-500-normal.ttf';
import plexSans600 from '@contour-ui/fonts/ttf/ibm-plex-sans-latin-600-normal.ttf';
import mono400 from '@contour-ui/fonts/ttf/jetbrains-mono-latin-400-normal.ttf';
import mono500 from '@contour-ui/fonts/ttf/jetbrains-mono-latin-500-normal.ttf';
import mono600 from '@contour-ui/fonts/ttf/jetbrains-mono-latin-600-normal.ttf';
import { registerFont } from 'soundor:ui';
import type { Asset } from 'soundor:ui';

/** A TTF face of `@contour-ui/fonts`, imported so the plugin's bundler ships its file. */
export interface RegisteredFace {
  readonly family: string;
  readonly weight: number;
  readonly source: Asset;
}

/**
 * Every face the text styles of the tokens use: IBM Plex Sans and JetBrains Mono at 400, 500
 * and 600. Static imports, one per file: a bundler ships only the files it sees imported.
 */
export const FACES: readonly RegisteredFace[] = [
  { family: 'IBM Plex Sans', weight: 400, source: plexSans400 },
  { family: 'IBM Plex Sans', weight: 500, source: plexSans500 },
  { family: 'IBM Plex Sans', weight: 600, source: plexSans600 },
  { family: 'JetBrains Mono', weight: 400, source: mono400 },
  { family: 'JetBrains Mono', weight: 500, source: mono500 },
  { family: 'JetBrains Mono', weight: 600, source: mono600 },
];

/**
 * Register the fonts of the contour-ui text styles (IBM Plex Sans, JetBrains Mono) with
 * Soundor, so text set in them is drawn in them rather than in a font of the system. Call it once,
 * before `render()`, so text is laid out in them from the first frame; the promise resolves once
 * every face is ready. Unused, it adds nothing to the plugin: Soundor's bundler ships the files
 * only when this function is called.
 *
 * @example
 * import { registerFonts } from '@contour-ui/soundor';
 * import { render } from '@soundor/react';
 *
 * void registerFonts();
 * render(<App />);
 */
export async function registerFonts(): Promise<void> {
  await Promise.all(
    FACES.map(({ family, weight, source }) => registerFont(family, source, { weight })),
  );
}
