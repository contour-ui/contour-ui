'use client';

/*
 * Kit's `Kbd` from a client module, for the MDX map: Kit cannot load on the server (it creates
 * contexts as it loads), so the map, which is built there, holds this export as a reference.
 */
export { Kbd } from '@contour-ui/kit';
