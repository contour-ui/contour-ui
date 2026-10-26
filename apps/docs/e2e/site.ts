import path from 'node:path';

/** The static docs build (`vp -C apps/docs run build`): prerendered pages, `.data` files, the search index. */
export const STATIC_DIR = path.resolve(import.meta.dirname, '../build/client');

/** Port of the static server started by `global-setup.ts` (the docs dev server uses 5174). */
export const PORT = 5184;
