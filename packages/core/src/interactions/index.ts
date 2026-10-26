/*
 * Interactions: input turned into intent, as pure functions of plain data. The adapter reads the
 * intent of an event and sends the machine an event of its own. Must never import states/.
 */
export type { KeyLike } from './key-like.ts';
export { getListIntent } from './list-navigation.ts';
export type { ListIntent, ListNavigationOptions } from './list-navigation.ts';
export { initialTypeahead, nextTypeahead } from './typeahead.ts';
export type { TypeaheadOptions, TypeaheadState } from './typeahead.ts';
