import { describe, expect, it } from 'vite-plus/test';

import { createListCollection } from './list-collection.ts';
import type { ListCollection } from './list-collection.ts';

interface Instrument {
  readonly id: string;
  readonly name: string;
  readonly section: string;
  readonly muted?: boolean;
}

const SNARE = { value: 'snare', label: 'Snare', disabled: true };

/** A collection of plain objects with `value`, `label` and `disabled`. */
const drums = createListCollection({
  items: [
    { value: 'kick', label: 'Kick' },
    SNARE,
    { value: 'hat', label: 'Hi-hat' },
    { value: 'tom', label: 'Tom' },
    { value: 'crash', label: 'Crash', disabled: true },
  ],
});

/** Strings: each one is its own value and text. */
const notes = createListCollection({ items: ['C', 'D', 'E'] });

/** Every step from every value, as `from → to` pairs. */
function steps(
  collection: ListCollection<unknown>,
  step: 'getNextValue' | 'getPreviousValue',
  loop: boolean,
): Record<string, string | null> {
  return Object.fromEntries(
    [null, ...collection.values].map((value) => [String(value), collection[step](value, { loop })]),
  );
}

describe('createListCollection', () => {
  it('reads values, texts and disabled states from strings and plain objects', () => {
    expect(notes.values).toStrictEqual(['C', 'D', 'E']);
    expect(notes.itemToString('D')).toBe('D');
    expect(notes.isItemDisabled('D')).toBe(false);

    expect(drums.values).toStrictEqual(['kick', 'snare', 'hat', 'tom', 'crash']);
    expect(drums.size).toBe(5);
    expect(drums.getItem('snare')).toBe(SNARE);
    expect(drums.itemToString(SNARE)).toBe('Snare');
    expect(drums.isItemDisabled(SNARE)).toBe(true);
    // Without a label, the text is the value.
    const bare = createListCollection({ items: [{ value: 'ride' }] });
    expect(bare.itemToString({ value: 'ride' })).toBe('ride');
  });

  it('reads any items through the functions given', () => {
    const items: Instrument[] = [
      { id: 'vln', name: 'Violin', section: 'Strings' },
      { id: 'tpt', name: 'Trumpet', section: 'Brass', muted: true },
    ];
    const orchestra = createListCollection({
      items,
      itemToValue: (item) => item.id,
      itemToString: (item) => item.name,
      isItemDisabled: (item) => item.muted === true,
    });

    expect(orchestra.values).toStrictEqual(['vln', 'tpt']);
    expect(orchestra.getItem('tpt')).toBe(items[1]);
    expect(orchestra.firstValue).toBe('vln');
    expect(orchestra.lastValue).toBe('vln');
    expect(orchestra.search('t')).toBeNull();
  });

  it('looks items up by value', () => {
    expect(drums.has('hat')).toBe(true);
    expect(drums.has('cowbell')).toBe(false);
    expect(drums.has(null)).toBe(false);
    expect(drums.indexOf('hat')).toBe(2);
    expect(drums.indexOf('cowbell')).toBe(-1);
    expect(drums.indexOf(undefined)).toBe(-1);
    expect(drums.getItem('hat')).toStrictEqual({ value: 'hat', label: 'Hi-hat' });
    expect(drums.getItem('cowbell')).toBeNull();
  });

  it('is immutable', () => {
    expect(Object.isFrozen(drums)).toBe(true);
    expect(Object.isFrozen(drums.items)).toBe(true);
    expect(Object.isFrozen(drums.values)).toBe(true);
    expect(Object.isFrozen(drums.groups)).toBe(true);
  });

  it('keeps no reference to the iterable it was given', () => {
    const items = ['C', 'D'];
    const collection = createListCollection({ items });
    items.push('E');

    expect(collection.values).toStrictEqual(['C', 'D']);
  });

  it('throws for an item without a value and for two items with the same value', () => {
    expect(() => createListCollection({ items: [{ label: 'Kick' }] })).toThrow(
      'createListCollection: an item is neither a string nor an object with a string `value`. Pass `itemToValue`.',
    );
    expect(() => createListCollection({ items: ['C', 'D', 'C'] })).toThrow(
      'createListCollection: two items have the value "C". Every item needs a value of its own.',
    );
  });

  describe('first and last values', () => {
    it('are the first and the last enabled items', () => {
      expect([drums.firstValue, drums.lastValue]).toStrictEqual(['kick', 'tom']);
      expect([notes.firstValue, notes.lastValue]).toStrictEqual(['C', 'E']);
    });

    it('are null without an enabled item', () => {
      const empty = createListCollection<string>({ items: [] });
      const disabled = createListCollection({ items: [{ value: 'a', disabled: true }] });

      expect([empty.firstValue, empty.lastValue, empty.size]).toStrictEqual([null, null, 0]);
      expect([disabled.firstValue, disabled.lastValue]).toStrictEqual([null, null]);
    });
  });

  describe('steps', () => {
    it('go to the next enabled item, and nowhere past the last one without loop', () => {
      expect(steps(drums, 'getNextValue', false)).toStrictEqual({
        null: 'kick',
        kick: 'hat',
        snare: 'hat',
        hat: 'tom',
        tom: null,
        crash: null,
      });
    });

    it('wrap around to the first enabled item with loop', () => {
      expect(steps(drums, 'getNextValue', true)).toStrictEqual({
        null: 'kick',
        kick: 'hat',
        snare: 'hat',
        hat: 'tom',
        tom: 'kick',
        crash: 'kick',
      });
    });

    it('go to the previous enabled item, and nowhere before the first one without loop', () => {
      expect(steps(drums, 'getPreviousValue', false)).toStrictEqual({
        null: 'tom',
        kick: null,
        snare: 'kick',
        hat: 'kick',
        tom: 'hat',
        crash: 'tom',
      });
    });

    it('wrap around to the last enabled item with loop', () => {
      expect(steps(drums, 'getPreviousValue', true)).toStrictEqual({
        null: 'tom',
        kick: 'tom',
        snare: 'kick',
        hat: 'kick',
        tom: 'hat',
        crash: 'tom',
      });
    });

    it('start from an end for a value that is not in the collection', () => {
      expect(drums.getNextValue('cowbell')).toBe('kick');
      expect(drums.getPreviousValue('cowbell')).toBe('tom');
    });

    it('stay on the only enabled item with loop', () => {
      const one = createListCollection({ items: ['a', { value: 'b', disabled: true }] });

      expect(one.getNextValue('a', { loop: true })).toBe('a');
      expect(one.getNextValue('a')).toBeNull();
    });

    it('go nowhere in a collection without an enabled item', () => {
      const empty = createListCollection<string>({ items: [] });

      expect(empty.getNextValue(null, { loop: true })).toBeNull();
      expect(empty.getPreviousValue(null, { loop: true })).toBeNull();
    });
  });

  describe('groups', () => {
    const items: Instrument[] = [
      { id: 'vln', name: 'Violin', section: 'Strings' },
      { id: 'tpt', name: 'Trumpet', section: 'Brass' },
      { id: 'vla', name: 'Viola', section: 'Strings' },
      { id: 'hrn', name: 'Horn', section: 'Brass' },
      { id: 'tmp', name: 'Timpani', section: 'Percussion' },
    ];
    const orchestra = createListCollection({
      items,
      itemToValue: (item) => item.id,
      itemToString: (item) => item.name,
      groupBy: (item) => item.section,
    });

    it('come in the order of their first items, and hold the items group by group', () => {
      expect(
        orchestra.groups.map((group) => [group.key, group.items.map((item) => item.id)]),
      ).toStrictEqual([
        ['Strings', ['vln', 'vla']],
        ['Brass', ['tpt', 'hrn']],
        ['Percussion', ['tmp']],
      ]);
      expect(orchestra.values).toStrictEqual(['vln', 'vla', 'tpt', 'hrn', 'tmp']);
      expect(orchestra.indexOf('tpt')).toBe(2);
    });

    it('set the order of steps', () => {
      expect(orchestra.getNextValue('vla')).toBe('tpt');
      expect(orchestra.getPreviousValue('tpt')).toBe('vla');
      expect(orchestra.lastValue).toBe('tmp');
    });

    it('pass the index of each item to groupBy', () => {
      const halves = createListCollection({
        items: ['a', 'b', 'c', 'd'],
        groupBy: (_item, index) => `half ${Math.floor(index / 2)}`,
      });

      expect(halves.groups.map((group) => [group.key, group.items])).toStrictEqual([
        ['half 0', ['a', 'b']],
        ['half 1', ['c', 'd']],
      ]);
    });

    it('are one group without groupBy, and none in an empty collection', () => {
      expect(notes.groups).toStrictEqual([{ key: '', items: ['C', 'D', 'E'] }]);
      expect(createListCollection<string>({ items: [] }).groups).toStrictEqual([]);
    });
  });

  describe('search', () => {
    const fruit = createListCollection({
      items: [
        'Apple',
        'Banana',
        'blueberry',
        { value: 'Blackberry', disabled: true },
        'Cherry',
        'Bach',
      ],
    });

    it.each([
      // [query, from, match]
      ['b', null, 'Banana'],
      ['B', null, 'Banana'],
      ['b', 'Apple', 'Banana'],
      ['b', 'Banana', 'blueberry'],
      // The disabled Blackberry is skipped.
      ['b', 'blueberry', 'Bach'],
      // Around the end, back to the start.
      ['b', 'Bach', 'Banana'],
      ['c', 'Cherry', null],
      ['z', null, null],
      ['', null, null],
    ] as const)('matches %j from %s: %s', (query, from, match) => {
      expect(fruit.search(query, { from })).toBe(match);
    });

    it('moves on with each press of the same character', () => {
      expect(fruit.search('bb', { from: 'Banana' })).toBe('blueberry');
      expect(fruit.search('bbb', { from: 'blueberry' })).toBe('Bach');
    });

    it('keeps the current item while a longer query still matches it', () => {
      expect(fruit.search('bl', { from: 'blueberry' })).toBe('blueberry');
      expect(fruit.search('ba', { from: 'Banana' })).toBe('Banana');
      expect(fruit.search('bac', { from: 'Banana' })).toBe('Bach');
      // From the start when nothing is highlighted.
      expect(fruit.search('bl')).toBe('blueberry');
    });

    it('matches the text, not the value', () => {
      const keys = createListCollection({
        items: [
          { value: 'c', label: 'Do' },
          { value: 'd', label: 'Re' },
        ],
      });

      expect(keys.search('r')).toBe('d');
      expect(keys.search('d')).toBe('c');
    });

    it('matches characters outside the Basic Multilingual Plane', () => {
      const clefs = createListCollection({ items: ['𝄞 treble', '𝄢 bass', '𝄞 alto'] });

      expect(clefs.search('𝄞')).toBe('𝄞 treble');
      expect(clefs.search('𝄞𝄞', { from: '𝄞 treble' })).toBe('𝄞 alto');
      expect(clefs.search('𝄢 b')).toBe('𝄢 bass');
    });
  });
});
