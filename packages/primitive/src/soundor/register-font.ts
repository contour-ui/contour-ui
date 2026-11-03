import { registerFont as registerSoundorFont } from 'soundor:ui';
import type { FontDescriptors as SoundorFontDescriptors } from 'soundor:ui';

/** What face of its family a font file is: its weight and its style. */
export type FontDescriptors = SoundorFontDescriptors;

/**
 * Make a bundled font file (`import face from './Face.ttf'`, TrueType or OpenType) a face of
 * `family` for the text of the plugin view, as CSS's `@font-face` does: Soundor's `registerFont`
 * of `soundor:ui`, called through. Text whose `fontFamily` is `family` is then set in its
 * registered faces, the one closest to its weight and style. Resolves once the face is ready.
 * Soundor only: a web app declares its faces in CSS.
 *
 * @example
 * import face from '@contour-ui/fonts/ttf/ibm-plex-sans-latin-400-normal.ttf';
 *
 * await registerFont('IBM Plex Sans', face, { weight: 400 });
 */
export function registerFont(
  family: string,
  source: string,
  descriptors?: FontDescriptors,
): Promise<void> {
  // No `undefined` reaches the runtime: a face without descriptors is called with two arguments.
  return descriptors === undefined
    ? registerSoundorFont(family, source)
    : registerSoundorFont(family, source, descriptors);
}
