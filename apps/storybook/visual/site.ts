import path from 'node:path';

/** The composed static Storybook (`vp run build-storybook`): `tokens/`, `react/`, … */
export const STATIC_DIR = path.resolve(import.meta.dirname, '../storybook-static');

/** Port of the static server started by `global-setup.ts` (dev Storybooks use 6100–6105). */
export const PORT = 6110;
