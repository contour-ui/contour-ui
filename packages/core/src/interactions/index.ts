/*
 * Interactions: input turned into intent, as pure functions of plain data. The adapter reads the
 * intent of an event and sends the machine an event of its own. Must never import states/.
 */
export { isDoublePress } from './double-press.ts';
export type { DoublePressOptions, PressLike } from './double-press.ts';
export type { KeyLike } from './key-like.ts';
export { getListIntent } from './list-navigation.ts';
export type { ListIntent, ListNavigationOptions } from './list-navigation.ts';
export { getRangeIntent } from './range-keys.ts';
export type { RangeIntent } from './range-keys.ts';
export { initialTypeahead, nextTypeahead } from './typeahead.ts';
export type { TypeaheadOptions, TypeaheadState } from './typeahead.ts';
export { getRangeWheelDelta, getWheelDelta } from './wheel.ts';
export type { RangeWheelLike, WheelDelta, WheelLike } from './wheel.ts';
