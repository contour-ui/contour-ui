import type { KeyLike } from './key-like.ts';

/** What typeahead remembers between key presses. */
export interface TypeaheadState {
  /** The characters typed so far, as they were typed; `''` before the first one. */
  readonly query: string;
  /** When the last character was typed, in milliseconds on the adapter's clock. */
  readonly time: number;
}

/** What {@link nextTypeahead} takes besides the key. */
export interface TypeaheadOptions {
  /**
   * How long typeahead waits for the next character, in milliseconds. A character typed later
   * starts a new query.
   *
   * @defaultValue 500
   */
  readonly timeout?: number | undefined;
}

/** How long typeahead waits for the next character when `timeout` is not set, in milliseconds. */
const DEFAULT_TIMEOUT = 500;

/** The state before the first key press: no query. */
export const initialTypeahead: TypeaheadState = { query: '', time: Number.NEGATIVE_INFINITY };

/** The first code point outside the Basic Multilingual Plane: two UTF-16 units from here on. */
const ASTRAL = 0x1_00_00;

/**
 * Whether a key value is one character, rather than the name of a key such as `Enter`: one
 * code point, which takes two UTF-16 units outside the Basic Multilingual Plane.
 */
const isCharacter = (key: string): boolean =>
  key.length === 1 || (key.length === 2 && (key.codePointAt(0) ?? 0) >= ASTRAL);

/**
 * Add the character of a key press to the typeahead query: the characters typed one after
 * another, each less than `timeout` milliseconds after the one before, such as `'ba'` to reach
 * "Banana". A character typed later starts a new query.
 *
 * Returns the new state, or `null` when the key types nothing for typeahead: a key that is not
 * one character (Enter, ArrowDown, Shift…), a key pressed with Ctrl or Meta (a shortcut), or
 * Space while no query is going on, so that Space can select. Alt is allowed: it types
 * characters such as `å` on macOS.
 *
 * Core has no clock: `now` comes from the adapter, such as the time stamp of the key event.
 * Matching the query against the items is up to the list (`search` of a list collection).
 *
 * @example
 * let state = initialTypeahead;
 * state = nextTypeahead(state, { key: 'b', … }, 1000) ?? state; // query 'b'
 * state = nextTypeahead(state, { key: 'a', … }, 1200) ?? state; // query 'ba'
 * state = nextTypeahead(state, { key: 'c', … }, 1900) ?? state; // query 'c': 700 ms later
 */
export function nextTypeahead(
  state: TypeaheadState,
  event: KeyLike,
  now: number,
  { timeout = DEFAULT_TIMEOUT }: TypeaheadOptions = {},
): TypeaheadState | null {
  if (event.ctrlKey || event.metaKey || !isCharacter(event.key)) {
    return null;
  }
  const typing = state.query !== '' && now - state.time < timeout;
  if (event.key === ' ' && !typing) {
    return null;
  }
  return { query: typing ? state.query + event.key : event.key, time: now };
}
