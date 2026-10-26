/** How {@link createListCollection} reads its items. */
export interface ListCollectionOptions<T> {
  /** The items. Without `groupBy`, the collection keeps their order. */
  readonly items: Iterable<T>;
  /**
   * The value of an item, which identifies it: in a selection, as the highlighted item, in the
   * ids of elements. Every item needs a value of its own.
   *
   * @defaultValue a string item itself, or the `value` of an object item
   */
  readonly itemToValue?: ((item: T) => string) | undefined;
  /**
   * The text of an item, which typeahead matches.
   *
   * @defaultValue a string item itself, the `label` of an object item, or else its value
   */
  readonly itemToString?: ((item: T) => string) | undefined;
  /**
   * Whether an item is disabled: it is never highlighted or selected, and navigation skips it.
   *
   * @defaultValue the `disabled` of an object item, `false` for any other
   */
  readonly isItemDisabled?: ((item: T) => boolean) | undefined;
  /**
   * The key of the group of an item. With it, the collection holds its items group by group:
   * the groups in the order their first items come, the items of each group in their order.
   */
  readonly groupBy?: ((item: T, index: number) => string) | undefined;
}

/** A group of items of a collection, as `groupBy` made it. */
export interface ListCollectionGroup<T> {
  /** The key `groupBy` returned for the items; `''` in a collection without `groupBy`. */
  readonly key: string;
  /** The items of the group, in their order. */
  readonly items: readonly T[];
}

/** How a step through a collection ends at its first or last enabled item. */
export interface ListStepOptions {
  /**
   * Wrap around to the other end. Without it, a step past an end goes nowhere.
   *
   * @defaultValue false
   */
  readonly loop?: boolean | undefined;
}

/** Where a typeahead search starts. */
export interface ListSearchOptions {
  /**
   * The value to search from, usually the highlighted one. `null`, or a value that is not in
   * the collection, searches from the first item.
   *
   * @defaultValue null
   */
  readonly from?: string | null | undefined;
}

/**
 * An immutable list of items with values, texts, disabled states and groups, and the ways to
 * move through it: what list components (Listbox, and later Select, Combobox, Menu) navigate.
 * Create one with {@link createListCollection}; for other items, create another.
 *
 * Its functions do not depend on `this`: pass them on as they are.
 */
export interface ListCollection<T> {
  /** The items, group by group when the collection has groups. */
  readonly items: readonly T[];
  /** The value of each item, in the order of `items`. */
  readonly values: readonly string[];
  /** How many items there are. */
  readonly size: number;
  /**
   * The groups of items. A collection without `groupBy` has one group with the key `''`; an
   * empty collection has none.
   */
  readonly groups: ReadonlyArray<ListCollectionGroup<T>>;
  /** The value of the first enabled item, or `null` when every item is disabled or there is none. */
  readonly firstValue: string | null;
  /** The value of the last enabled item, or `null` when every item is disabled or there is none. */
  readonly lastValue: string | null;
  /** The value of an item. */
  itemToValue(item: T): string;
  /** The text of an item. */
  itemToString(item: T): string;
  /** Whether an item is disabled. */
  isItemDisabled(item: T): boolean;
  /** Whether an item has this value. */
  has(value: string | null | undefined): boolean;
  /** The item with this value, or `null`. */
  getItem(value: string | null | undefined): T | null;
  /** The position of the item with this value in `items`, or `-1`. */
  indexOf(value: string | null | undefined): number;
  /**
   * The value of the next enabled item after `value`. Past the last one, with `loop`, the first
   * enabled item; without it, `null`. From `null`, or a value that is not in the collection, the
   * first enabled item.
   */
  getNextValue(value: string | null, options?: ListStepOptions): string | null;
  /**
   * The value of the previous enabled item before `value`. Before the first one, with `loop`, the
   * last enabled item; without it, `null`. From `null`, or a value that is not in the collection,
   * the last enabled item.
   */
  getPreviousValue(value: string | null, options?: ListStepOptions): string | null;
  /**
   * The value of the enabled item whose text starts with `query`, ignoring case: the typeahead
   * match, or `null` when no item matches.
   *
   * - One character, or the same character typed again (`'b'`, `'bbb'`), moves on: the search
   *   starts after `from`, wraps around, and skips `from` itself, so each press of `b` goes to
   *   the next item that starts with "b".
   * - Several characters (`'ba'`) refine the match: the search starts at `from` itself, so the
   *   highlighted item stays while its text still matches.
   */
  search(query: string, options?: ListSearchOptions): string | null;
}

const isRecord = (item: unknown): item is Readonly<Record<string, unknown>> =>
  typeof item === 'object' && item !== null;

/** A string item itself, or the `value` of an object item. */
function defaultItemToValue(item: unknown): string {
  if (typeof item === 'string') {
    return item;
  }
  if (isRecord(item) && typeof item['value'] === 'string') {
    return item['value'];
  }
  throw new Error(
    'createListCollection: an item is neither a string nor an object with a string `value`. Pass `itemToValue`.',
  );
}

/** The `disabled` of an object item. */
const defaultIsItemDisabled = (item: unknown): boolean =>
  isRecord(item) && item['disabled'] === true;

/** The groups of items, in the order their first items come; one group without `groupBy`. */
function groupItems<T>(
  items: readonly T[],
  groupBy: ListCollectionOptions<T>['groupBy'],
): Array<ListCollectionGroup<T>> {
  if (items.length === 0) {
    return [];
  }
  if (groupBy === undefined) {
    return [{ key: '', items: Object.freeze(items) }];
  }
  const groups = new Map<string, T[]>();
  for (const [index, item] of items.entries()) {
    const key = groupBy(item, index);
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [item]);
    } else {
      group.push(item);
    }
  }
  return [...groups].map(([key, members]) => Object.freeze({ key, items: Object.freeze(members) }));
}

/** The first character of a string: one code point, which may take two UTF-16 units. */
const firstCharacter = (text: string): string => String.fromCodePoint(text.codePointAt(0) ?? 0);

/**
 * Create a list collection: the items with their values, texts and disabled states, grouped
 * with `groupBy`. It never changes; for other items, create another one (in React, inside
 * `useMemo`).
 *
 * Throws when an item has no value (see `itemToValue`) or when two items have the same value.
 *
 * @example
 * const collection = createListCollection({
 *   items: [
 *     { value: 'kick', label: 'Kick' },
 *     { value: 'snare', label: 'Snare', disabled: true },
 *     { value: 'hat', label: 'Hi-hat' },
 *   ],
 * });
 * collection.getNextValue('kick'); // 'hat': the snare is disabled
 * collection.search('h'); // 'hat'
 */
export function createListCollection<T>(options: ListCollectionOptions<T>): ListCollection<T> {
  const itemToValue = options.itemToValue ?? defaultItemToValue;
  const itemToString =
    options.itemToString ??
    ((item: T): string =>
      isRecord(item) && typeof item['label'] === 'string' ? item['label'] : itemToValue(item));
  const isItemDisabled = options.isItemDisabled ?? defaultIsItemDisabled;

  const groups = Object.freeze(groupItems([...options.items], options.groupBy));
  const items = Object.freeze(groups.flatMap((group) => group.items));
  const values = Object.freeze(items.map((item) => itemToValue(item)));
  const indexes = new Map<string, number>();
  for (const [index, value] of values.entries()) {
    if (indexes.has(value)) {
      throw new Error(
        `createListCollection: two items have the value "${value}". Every item needs a value of its own.`,
      );
    }
    indexes.set(value, index);
  }

  const indexOf = (value: string | null | undefined): number =>
    value === null || value === undefined ? -1 : (indexes.get(value) ?? -1);
  const isEnabledAt = (index: number): boolean => {
    const item = items[index];
    return item !== undefined && !isItemDisabled(item);
  };
  const valueAt = (index: number): string | null => values[index] ?? null;
  /** The index of the first enabled item from `start` on, moving by `step`; `-1` when none. */
  const scan = (start: number, step: 1 | -1): number => {
    for (let index = start; index >= 0 && index < items.length; index += step) {
      if (isEnabledAt(index)) {
        return index;
      }
    }
    return -1;
  };
  const firstValue = valueAt(scan(0, 1));
  const lastValue = valueAt(scan(items.length - 1, -1));

  return Object.freeze({
    items,
    values,
    size: items.length,
    groups,
    firstValue,
    lastValue,
    itemToValue,
    itemToString,
    isItemDisabled,
    has: (value: string | null | undefined): boolean => indexOf(value) !== -1,
    getItem: (value: string | null | undefined): T | null => items[indexOf(value)] ?? null,
    indexOf,
    getNextValue: (value: string | null, { loop = false }: ListStepOptions = {}) => {
      const index = indexOf(value);
      if (index === -1) {
        return firstValue;
      }
      return valueAt(scan(index + 1, 1)) ?? (loop ? firstValue : null);
    },
    getPreviousValue: (value: string | null, { loop = false }: ListStepOptions = {}) => {
      const index = indexOf(value);
      if (index === -1) {
        return lastValue;
      }
      return valueAt(scan(index - 1, -1)) ?? (loop ? lastValue : null);
    },
    search: (query: string, { from = null }: ListSearchOptions = {}) => {
      if (query === '') {
        return null;
      }
      const head = firstCharacter(query);
      // 'bbb' is a third press of `b`: the next item that starts with "b".
      const single = query === head.repeat(query.length / head.length);
      const prefix = (single ? head : query).toLowerCase();
      const start = indexOf(from);
      // One character moves on from the current item, more characters refine it.
      const first = start === -1 ? 0 : start + (single ? 1 : 0);
      for (let offset = 0; offset < items.length; offset += 1) {
        const index = (first + offset) % items.length;
        const item = items[index];
        if (single && index === start) {
          continue;
        }
        if (
          item !== undefined &&
          !isItemDisabled(item) &&
          itemToString(item).toLowerCase().startsWith(prefix)
        ) {
          return valueAt(index);
        }
      }
      return null;
    },
  });
}
