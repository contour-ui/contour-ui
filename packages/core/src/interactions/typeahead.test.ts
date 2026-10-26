import { describe, expect, it } from 'vite-plus/test';

import type { KeyLike } from './key-like.ts';
import { initialTypeahead, nextTypeahead } from './typeahead.ts';
import type { TypeaheadOptions, TypeaheadState } from './typeahead.ts';

/** A key press, with the modifiers given and no others. */
function press(key: string, modifiers: Partial<Omit<KeyLike, 'key'>> = {}): KeyLike {
  return { key, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...modifiers };
}

/**
 * Press keys one after another, each at its time in milliseconds, from the initial state. Returns
 * the query after each press, or `null` for a press that typed nothing and kept the state.
 */
function type(
  presses: ReadonlyArray<readonly [key: KeyLike | string, time: number]>,
  options?: TypeaheadOptions,
): Array<string | null> {
  let state: TypeaheadState = initialTypeahead;
  return presses.map(([key, time]) => {
    const next = nextTypeahead(state, typeof key === 'string' ? press(key) : key, time, options);
    if (next === null) {
      return null;
    }
    state = next;
    return next.query;
  });
}

describe('nextTypeahead', () => {
  it('starts with no query', () => {
    expect(initialTypeahead.query).toBe('');
  });

  it('adds the characters typed within the timeout to the query', () => {
    expect(
      type([
        ['b', 0],
        ['a', 200],
        ['n', 699],
      ]),
    ).toStrictEqual(['b', 'ba', 'ban']);
  });

  it('records when the last character was typed', () => {
    expect(nextTypeahead(initialTypeahead, press('b'), 1000)).toStrictEqual({
      query: 'b',
      time: 1000,
    });
  });

  it('starts a new query once the timeout has passed since the last character', () => {
    expect(
      type([
        ['b', 0],
        ['a', 499],
        ['c', 999],
        ['d', 1200],
      ]),
    ).toStrictEqual(['b', 'ba', 'c', 'cd']);
  });

  it('waits as long as the timeout option says', () => {
    expect(
      type(
        [
          ['b', 0],
          ['a', 900],
          ['c', 2000],
        ],
        { timeout: 1000 },
      ),
    ).toStrictEqual(['b', 'ba', 'c']);
  });

  it('keeps the characters as typed, repeated ones too: matching is up to the list', () => {
    expect(
      type([
        ['B', 0],
        ['b', 100],
        ['é', 200],
        ['𝄞', 300],
      ]),
    ).toStrictEqual(['B', 'Bb', 'Bbé', 'Bbé𝄞']);
  });

  it.each([
    ['a key that is not a character', press('Enter')],
    ['an arrow', press('ArrowDown')],
    ['a modifier on its own', press('Shift', { shiftKey: true })],
    ['a dead key', press('Dead')],
    ['a character with Ctrl', press('a', { ctrlKey: true })],
    ['a character with Meta', press('a', { metaKey: true })],
  ])('types nothing for %s and keeps the query', (_name, key) => {
    expect(
      type([
        ['b', 0],
        [key, 100],
        ['a', 200],
      ]),
    ).toStrictEqual(['b', null, 'ba']);
  });

  it('types the characters of Shift and Alt', () => {
    expect(
      type([
        [press('B', { shiftKey: true }), 0],
        [press('å', { altKey: true }), 100],
      ]),
    ).toStrictEqual(['B', 'Bå']);
  });

  it('adds Space only while a query is going on, so that Space can select otherwise', () => {
    expect(
      type([
        [' ', 0],
        ['n', 100],
        ['e', 200],
        ['w', 300],
        [' ', 400],
        ['y', 500],
        [' ', 1100],
      ]),
    ).toStrictEqual([null, 'n', 'ne', 'new', 'new ', 'new y', null]);
  });
});
