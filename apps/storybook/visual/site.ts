import path from 'node:path';

/** The composed static Storybook (`vp run build-storybook`): `tokens/`, `kit/`, … */
export const STATIC_DIR = path.resolve(import.meta.dirname, '../storybook-static');

/** Port of the static server started by `global-setup.ts` (dev Storybooks use 6100–6104). */
export const PORT = 6110;
