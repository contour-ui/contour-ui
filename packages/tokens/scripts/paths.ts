/** File locations of the tokens package (side-effect free; shared by scripts and tests). */
import path from 'node:path';

export const PACKAGE_DIR = path.resolve(import.meta.dirname, '..');
export const RESOLVER_FILE = path.join(PACKAGE_DIR, 'contour.resolver.json');

/** Generated DTCG sources (scripts/generate.ts). */
export const PALETTE_FILE = path.join(PACKAGE_DIR, 'src', 'base', 'color.tokens.json');
export const semanticColorFile = (theme: 'dark' | 'light'): string =>
  path.join(PACKAGE_DIR, 'src', 'semantic', `color.${theme}.tokens.json`);

/** Generated outputs (scripts/build.ts). */
export const CSS_FILE = path.join(PACKAGE_DIR, 'src', 'generated', 'tokens.css');
export const TS_FILE = path.join(PACKAGE_DIR, 'src', 'generated', 'vars.ts');
export const DOCS_FILE = path.join(PACKAGE_DIR, 'src', 'generated', 'docs.json');
