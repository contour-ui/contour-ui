import { createIdRegistry } from '../native/id-registry.ts';
import type { IdRegistry } from '../native/id-registry.ts';

/** The id references of the Soundor runtime: one registry for every element of the build. */
export const idRegistry: IdRegistry = createIdRegistry();
