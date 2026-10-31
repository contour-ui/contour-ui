/** File locations of the tokens package (side-effect free; shared by scripts). */
import path from 'node:path';

export const PACKAGE_DIR = path.resolve(import.meta.dirname, '..');

/** DTCG sources of the colors. */
export const PALETTE_FILE = path.join(PACKAGE_DIR, 'src', 'base', 'color.tokens.json');
export const semanticColorFile = (theme: 'dark' | 'light'): string =>
  path.join(PACKAGE_DIR, 'src', 'semantic', `color.${theme}.tokens.json`);
