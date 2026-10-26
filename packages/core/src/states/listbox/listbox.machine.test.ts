import { describe, expect, it, vi } from 'vite-plus/test';

import { createListCollection } from '../../collection/index.ts';
import type { ListCollection } from '../../collection/index.ts';
import { createService, createTestPlatform, transition } from '../../machine/index.ts';
import type { MachineReadParams, Service } from '../../machine/index.ts';
import { listboxMachine } from './listbox.machine.ts';
import type {
  ListboxEvent,
  ListboxHighlightChangeDetails,
  ListboxInput,
  ListboxProps,
  ListboxSchema,
  ListboxSelectDetails,
  ListboxValueChangeDetails,
} from './listbox.types.ts';

interface Fruit {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

const FRUIT: readonly Fruit[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'blueberry', label: 'Blueberry', disabled: true },
  { value: 'cherry', label: 'Cherry' },
  { value: 'date', label: 'Date' },
];

/** Apple, Banana, Blueberry (disabled), Cherry, Date. */
const fruit = createListCollection({ items: FRUIT });

/** A started listbox of `fruit` (or of the collection given) on the test platform. */
function listbox(props: Partial<ListboxInput> = {}) {
  const test = createTestPlatform(listboxMachine);
  const service = createService(listboxMachine, {
    props: { collection: fruit, ...props },
    platform: test.platform,
  });
  service.start();
  return { service, test };
}

const highlighted = (service: Service<ListboxSchema>): string | null =>
  service.context.get('highlightedValue');

const selected = (service: Service<ListboxSchema>): readonly string[] =>
  service.context.get('value');

/** Send each event, and return the highlighted value after each one. */
function highlights(service: Service<ListboxSchema>, events: readonly ListboxEvent[]) {
  return events.map((event) => {
    service.send(event);
    return highlighted(service);
  });
}

const NEXT = { type: 'HIGHLIGHT.NEXT' } as const;
const PREVIOUS = { type: 'HIGHLIGHT.PREVIOUS' } as const;
const FIRST = { type: 'HIGHLIGHT.FIRST' } as const;
const LAST = { type: 'HIGHLIGHT.LAST' } as const;
const SELECT = { type: 'HIGHLIGHTED.SELECT' } as const;

const typeahead = (query: string): ListboxEvent => ({ type: 'TYPEAHEAD', query });
const click = (value: string): ListboxEvent => ({ type: 'ITEM.CLICK', value });
const hover = (value: string): ListboxEvent => ({ type: 'ITEM.HOVER', value });

const valueSpy = () => vi.fn<(details: ListboxValueChangeDetails) => void>();
const highlightSpy = () => vi.fn<(details: ListboxHighlightChangeDetails) => void>();
const selectSpy = () => vi.fn<(details: ListboxSelectDetails) => void>();

/** The item of `fruit` with this value. */
function item(value: string): Fruit {
  const found = FRUIT.find((candidate) => candidate.value === value);
  if (found === undefined) {
    throw new Error(`No fruit ${value}.`);
  }
  return found;
}

/** Pass new props as `useMachine` does on a render, and run the watch actions. */
function render(service: Service<ListboxSchema>, props: ListboxInput): void {
  service.setProps(props);
  service.syncProps();
}

/** `fruit` without the items of these values. */
const without = (...values: readonly string[]): ListCollection<Fruit> =>
  createListCollection({
    items: FRUIT.filter((fruitItem) => !values.includes(fruitItem.value)),
  });

/** The commands that run these actions. */
const run = (...actions: readonly string[]) => actions.map((action) => ({ type: 'run', action }));

describe('listbox machine', () => {
  it('starts with nothing selected or highlighted, and fills in the defaults', () => {
    const { service, test } = listbox();

    expect(service.matches('idle')).toBe(true);
    expect([selected(service), highlighted(service)]).toStrictEqual([[], null]);
    expect(service.context.get('focused')).toBe(false);
    expect({
      selectionMode: service.prop('selectionMode'),
      deselectable: service.prop('deselectable'),
      selectOnHighlight: service.prop('selectOnHighlight'),
      loopFocus: service.prop('loopFocus'),
      typeahead: service.prop('typeahead'),
      highlightOnHover: service.prop('highlightOnHover'),
      autoHighlight: service.prop('autoHighlight'),
      disabled: service.prop('disabled'),
      orientation: service.prop('orientation'),
    }).toStrictEqual({
      selectionMode: 'single',
      deselectable: false,
      selectOnHighlight: false,
      loopFocus: false,
      typeahead: true,
      highlightOnHover: true,
      autoHighlight: false,
      disabled: false,
      orientation: 'vertical',
    });
    // No platform actions, effects or delays.
    expect(test.log).toStrictEqual([]);
  });

  it('starts with the default value and highlight', () => {
    const { service } = listbox({ defaultValue: ['cherry'], defaultHighlightedValue: 'banana' });

    expect([selected(service), highlighted(service)]).toStrictEqual([['cherry'], 'banana']);
  });

  describe('highlight', () => {
    it('steps through the enabled items and stops at the ends', () => {
      const { service } = listbox();

      expect(highlights(service, [NEXT, NEXT, NEXT, NEXT, NEXT])).toStrictEqual([
        'apple',
        'banana',
        // Blueberry is disabled.
        'cherry',
        'date',
        'date',
      ]);
      expect(highlights(service, [PREVIOUS, PREVIOUS, PREVIOUS, PREVIOUS])).toStrictEqual([
        'cherry',
        'banana',
        'apple',
        'apple',
      ]);
    });

    it('starts from the last item when stepping back from no highlight', () => {
      const { service } = listbox();

      expect(highlights(service, [PREVIOUS])).toStrictEqual(['date']);
    });

    it('wraps around at the ends with loopFocus', () => {
      const { service } = listbox({ loopFocus: true, defaultHighlightedValue: 'date' });

      expect(highlights(service, [NEXT, PREVIOUS, PREVIOUS])).toStrictEqual([
        'apple',
        'date',
        'cherry',
      ]);
    });

    it('goes to the first and the last enabled item', () => {
      const ends = createListCollection({
        items: [
          { value: 'a', disabled: true },
          { value: 'b' },
          { value: 'c' },
          { value: 'd', disabled: true },
        ],
      });
      const { service } = listbox({ collection: ends });

      expect(highlights(service, [LAST, FIRST])).toStrictEqual(['c', 'b']);
    });

    it('stays without a highlight in a list without an enabled item', () => {
      const { service } = listbox({ collection: createListCollection<Fruit>({ items: [] }) });

      expect(highlights(service, [NEXT, PREVIOUS, FIRST, LAST])).toStrictEqual([
        null,
        null,
        null,
        null,
      ]);
    });

    it('highlights any value, or none, on HIGHLIGHT.SET', () => {
      const { service } = listbox();

      expect(
        highlights(service, [
          { type: 'HIGHLIGHT.SET', value: 'date' },
          { type: 'HIGHLIGHT.SET', value: null },
        ]),
      ).toStrictEqual(['date', null]);
    });

    it('reports every move with the item and its position', () => {
      const onHighlightChange = highlightSpy();
      const { service } = listbox({ onHighlightChange });

      highlights(service, [NEXT, NEXT, LAST, LAST, { type: 'HIGHLIGHT.SET', value: null }]);
      expect(onHighlightChange.mock.calls).toStrictEqual([
        [{ highlightedValue: 'apple', highlightedItem: item('apple'), highlightedIndex: 0 }],
        [{ highlightedValue: 'banana', highlightedItem: item('banana'), highlightedIndex: 1 }],
        [{ highlightedValue: 'date', highlightedItem: item('date'), highlightedIndex: 4 }],
        [{ highlightedValue: null, highlightedItem: null, highlightedIndex: -1 }],
      ]);
    });

    it('follows a controlled highlight: moves only report it', () => {
      const onHighlightChange = highlightSpy();
      const { service } = listbox({ highlightedValue: 'banana', onHighlightChange });

      service.send(NEXT);
      expect(highlighted(service)).toBe('banana');
      expect(onHighlightChange.mock.calls[0]?.[0].highlightedValue).toBe('cherry');

      // The owner passes the new value back; `null` controls it too.
      service.setProps({ collection: fruit, highlightedValue: null, onHighlightChange });
      expect(highlighted(service)).toBeNull();
      service.send(PREVIOUS);
      expect(onHighlightChange.mock.calls[1]?.[0].highlightedValue).toBe('date');
    });
  });

  describe('typeahead', () => {
    const berries = createListCollection({
      items: [
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana' },
        { value: 'blueberry', label: 'Blueberry', disabled: true },
        { value: 'bilberry', label: 'Bilberry' },
        { value: 'cherry', label: 'Cherry' },
      ],
    });

    it('highlights the enabled item the query matches', () => {
      const { service } = listbox({ collection: berries });

      expect(
        highlights(service, [typeahead('b'), typeahead('bi'), typeahead('c'), typeahead('z')]),
      ).toStrictEqual(['banana', 'bilberry', 'cherry', 'cherry']);
    });

    it('moves on with each press of the same letter, and refines with more letters', () => {
      const { service } = listbox({ collection: berries });

      expect(
        highlights(service, [typeahead('b'), typeahead('bb'), typeahead('bbb')]),
      ).toStrictEqual(['banana', 'bilberry', 'banana']);
      expect(highlights(service, [typeahead('ba')])).toStrictEqual(['banana']);
    });

    it('does nothing with typeahead off', () => {
      const { service } = listbox({ collection: berries, typeahead: false });

      expect(highlights(service, [typeahead('b')])).toStrictEqual([null]);
    });
  });

  describe('selection', () => {
    it('replaces a single selection, and reports the value and the selected item', () => {
      const onValueChange = valueSpy();
      const onSelect = selectSpy();
      const { service } = listbox({ onValueChange, onSelect });

      service.send(click('banana'));
      expect([selected(service), highlighted(service)]).toStrictEqual([['banana'], 'banana']);
      service.send(click('date'));
      expect(selected(service)).toStrictEqual(['date']);

      expect(onValueChange.mock.calls).toStrictEqual([
        [{ value: ['banana'], items: [item('banana')] }],
        [{ value: ['date'], items: [item('date')] }],
      ]);
      expect(onSelect.mock.calls).toStrictEqual([
        [{ value: 'banana', item: item('banana') }],
        [{ value: 'date', item: item('date') }],
      ]);
    });

    it('reports a selected item selected again, without a new value', () => {
      const onValueChange = valueSpy();
      const onSelect = selectSpy();
      const { service } = listbox({ onValueChange, onSelect });

      service.send(click('banana'));
      service.send(click('banana'));
      expect(selected(service)).toStrictEqual(['banana']);
      expect(onValueChange).toHaveBeenCalledOnce();
      expect(onSelect).toHaveBeenCalledTimes(2);
    });

    it('clears a single selection when the selected item is selected again with deselectable', () => {
      const onValueChange = valueSpy();
      const onSelect = selectSpy();
      const { service } = listbox({ deselectable: true, onValueChange, onSelect });

      service.send(click('banana'));
      service.send(click('banana'));
      expect(selected(service)).toStrictEqual([]);
      expect(onValueChange.mock.calls.at(-1)).toStrictEqual([{ value: [], items: [] }]);
      // Nothing was selected the second time.
      expect(onSelect).toHaveBeenCalledOnce();
    });

    it('toggles items in a multiple selection, in the order they were selected', () => {
      const onSelect = selectSpy();
      const { service } = listbox({ selectionMode: 'multiple', onSelect });

      service.send(click('date'));
      service.send(click('apple'));
      service.send(click('cherry'));
      expect(selected(service)).toStrictEqual(['date', 'apple', 'cherry']);
      service.send(click('apple'));
      expect(selected(service)).toStrictEqual(['date', 'cherry']);
      expect(onSelect.mock.calls.map(([details]) => details.value)).toStrictEqual([
        'date',
        'apple',
        'cherry',
      ]);
    });

    it('selects the highlighted item on HIGHLIGHTED.SELECT, and nothing without one', () => {
      const { service } = listbox();

      service.send(SELECT);
      expect(selected(service)).toStrictEqual([]);
      service.send(NEXT);
      service.send(SELECT);
      expect(selected(service)).toStrictEqual(['apple']);
    });

    it('selects an item without moving the highlight on ITEM.SELECT', () => {
      const { service } = listbox({ defaultHighlightedValue: 'apple' });

      service.send({ type: 'ITEM.SELECT', value: 'cherry' });
      expect([selected(service), highlighted(service)]).toStrictEqual([['cherry'], 'apple']);
    });

    it('ignores disabled items and values that are not in the collection', () => {
      const onSelect = selectSpy();
      const { service } = listbox({ defaultHighlightedValue: 'apple', onSelect });

      service.send(click('blueberry'));
      service.send({ type: 'ITEM.SELECT', value: 'blueberry' });
      service.send({ type: 'ITEM.SELECT', value: 'cowberry' });
      service.send(hover('blueberry'));
      expect([selected(service), highlighted(service)]).toStrictEqual([[], 'apple']);
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('replaces the selection on VALUE.SET, without onSelect', () => {
      const onValueChange = valueSpy();
      const onSelect = selectSpy();
      const { service } = listbox({ onValueChange, onSelect });

      service.send({ type: 'VALUE.SET', value: ['date', 'cowberry'] });
      expect(selected(service)).toStrictEqual(['date', 'cowberry']);
      // A value that is not in the collection has no item.
      expect(onValueChange.mock.calls).toStrictEqual([
        [{ value: ['date', 'cowberry'], items: [item('date')] }],
      ]);
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('follows a controlled value: selections only report the new one', () => {
      const onValueChange = valueSpy();
      const { service } = listbox({ value: ['apple'], onValueChange });

      service.send(click('date'));
      expect(selected(service)).toStrictEqual(['apple']);
      expect(onValueChange.mock.calls).toStrictEqual([
        [{ value: ['date'], items: [item('date')] }],
      ]);

      service.setProps({ collection: fruit, value: ['date'], onValueChange });
      expect(selected(service)).toStrictEqual(['date']);
    });

    it('adds to a controlled multiple selection from the value the owner passes', () => {
      const onValueChange = valueSpy();
      const { service } = listbox({
        selectionMode: 'multiple',
        value: ['apple', 'date'],
        onValueChange,
      });

      service.send(click('cherry'));
      expect(onValueChange.mock.calls[0]?.[0].value).toStrictEqual(['apple', 'date', 'cherry']);
    });
  });

  describe('selectOnHighlight', () => {
    it('selects what the keys and typeahead highlight, reporting each item once', () => {
      const onSelect = selectSpy();
      const { service } = listbox({ selectOnHighlight: true, onSelect });

      service.send(NEXT);
      expect(selected(service)).toStrictEqual(['apple']);
      service.send(LAST);
      service.send(LAST);
      expect(selected(service)).toStrictEqual(['date']);
      service.send(typeahead('c'));
      expect(selected(service)).toStrictEqual(['cherry']);
      expect(onSelect.mock.calls.map(([details]) => details.value)).toStrictEqual([
        'apple',
        'date',
        'cherry',
      ]);
    });

    it('selects the highlighted item a key leaves in place when it is not selected yet', () => {
      const onSelect = selectSpy();
      const { service } = listbox({ selectOnHighlight: true, onSelect });

      // Focus highlights the first item without selecting it; Home stays there and selects it.
      service.send({ type: 'CONTENT.FOCUS' });
      expect(selected(service)).toStrictEqual([]);
      service.send(FIRST);
      service.send(FIRST);
      expect(selected(service)).toStrictEqual(['apple']);
      expect(onSelect).toHaveBeenCalledOnce();
    });

    it('does not select what the pointer or HIGHLIGHT.SET highlights', () => {
      const { service } = listbox({ selectOnHighlight: true });

      service.send(hover('banana'));
      service.send({ type: 'HIGHLIGHT.SET', value: 'cherry' });
      expect(selected(service)).toStrictEqual([]);
    });

    it('does not select in a multiple selection', () => {
      const { service } = listbox({ selectOnHighlight: true, selectionMode: 'multiple' });

      service.send(NEXT);
      service.send(NEXT);
      expect(selected(service)).toStrictEqual([]);
    });
  });

  describe('focus', () => {
    it('highlights the first item when the list gets focus with nothing selected', () => {
      const { service } = listbox();

      service.send({ type: 'CONTENT.FOCUS' });
      expect([service.context.get('focused'), highlighted(service)]).toStrictEqual([true, 'apple']);
    });

    it('highlights the first selected item in the order of the list', () => {
      const { service } = listbox({
        selectionMode: 'multiple',
        defaultValue: ['date', 'blueberry', 'cherry'],
      });

      service.send({ type: 'CONTENT.FOCUS' });
      // The disabled blueberry comes first, but cannot be highlighted.
      expect(highlighted(service)).toBe('cherry');
    });

    it('keeps the highlighted item', () => {
      const { service } = listbox({ defaultValue: ['date'], defaultHighlightedValue: 'banana' });

      service.send({ type: 'CONTENT.FOCUS' });
      expect(highlighted(service)).toBe('banana');
    });

    it('highlights nothing when the input gets focus, unless autoHighlight is on', () => {
      const plain = listbox();
      plain.service.send({ type: 'INPUT.FOCUS' });
      expect([plain.service.context.get('focused'), highlighted(plain.service)]).toStrictEqual([
        true,
        null,
      ]);

      const auto = listbox({ autoHighlight: true });
      auto.service.send({ type: 'INPUT.FOCUS' });
      expect(highlighted(auto.service)).toBe('apple');
    });

    it('clears the highlight when focus leaves the listbox', () => {
      const { service } = listbox();

      service.send({ type: 'CONTENT.FOCUS' });
      service.send(NEXT);
      service.send({ type: 'BLUR' });
      expect([service.context.get('focused'), highlighted(service)]).toStrictEqual([false, null]);
    });
  });

  describe('pointer', () => {
    it('highlights the item under the pointer', () => {
      const { service } = listbox();

      expect(highlights(service, [hover('cherry'), hover('apple')])).toStrictEqual([
        'cherry',
        'apple',
      ]);
    });

    it('leaves the highlight to the keyboard without highlightOnHover', () => {
      const { service } = listbox({ highlightOnHover: false, defaultHighlightedValue: 'date' });

      expect(highlights(service, [hover('cherry'), { type: 'POINTER.LEAVE' }])).toStrictEqual([
        'date',
        'date',
      ]);
    });

    it('clears the highlight when the pointer leaves a list without focus', () => {
      const { service } = listbox();

      expect(highlights(service, [hover('cherry'), { type: 'POINTER.LEAVE' }])).toStrictEqual([
        'cherry',
        null,
      ]);
    });

    it('keeps the highlight when the pointer leaves a list with focus', () => {
      const { service } = listbox();

      service.send({ type: 'INPUT.FOCUS' });
      expect(highlights(service, [hover('cherry'), { type: 'POINTER.LEAVE' }])).toStrictEqual([
        'cherry',
        'cherry',
      ]);
    });
  });

  describe('disabled', () => {
    it('ignores the user', () => {
      const onSelect = selectSpy();
      const { service } = listbox({ disabled: true, onSelect });

      service.send({ type: 'CONTENT.FOCUS' });
      expect(
        highlights(service, [
          NEXT,
          PREVIOUS,
          FIRST,
          LAST,
          typeahead('c'),
          hover('cherry'),
          click('cherry'),
        ]),
      ).toStrictEqual([null, null, null, null, null, null, null]);
      service.send({ type: 'ITEM.SELECT', value: 'cherry' });
      expect(selected(service)).toStrictEqual([]);
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('still takes the value and the highlight from the owner', () => {
      const { service } = listbox({ disabled: true, defaultHighlightedValue: 'banana' });

      service.send({ type: 'VALUE.SET', value: ['date'] });
      service.send({ type: 'HIGHLIGHT.SET', value: 'apple' });
      // Selecting the highlighted item is the user's.
      service.send(SELECT);
      expect([selected(service), highlighted(service)]).toStrictEqual([['date'], 'apple']);
    });
  });

  describe('new items', () => {
    it('keep the highlight when a new collection has the same items', () => {
      const onHighlightChange = highlightSpy();
      const { service } = listbox({ autoHighlight: true, onHighlightChange });
      service.send({ type: 'INPUT.FOCUS' });
      service.send(NEXT);

      render(service, {
        collection: createListCollection({ items: FRUIT }),
        autoHighlight: true,
        onHighlightChange,
      });
      expect(highlighted(service)).toBe('banana');
    });

    it('clear a highlighted item that is gone, and keep one that is not', () => {
      const { service } = listbox({ defaultHighlightedValue: 'cherry' });

      render(service, { collection: without('apple') });
      expect(highlighted(service)).toBe('cherry');
      render(service, { collection: without('apple', 'cherry') });
      expect(highlighted(service)).toBeNull();
    });

    it('highlight the first item with autoHighlight while the listbox has focus', () => {
      const { service } = listbox({ autoHighlight: true });
      service.send({ type: 'INPUT.FOCUS' });
      service.send(LAST);

      render(service, { collection: without('apple'), autoHighlight: true });
      expect(highlighted(service)).toBe('banana');
      render(service, {
        collection: createListCollection<Fruit>({ items: [] }),
        autoHighlight: true,
      });
      expect(highlighted(service)).toBeNull();
    });

    it('highlight nothing new with autoHighlight while the listbox has no focus', () => {
      const { service } = listbox({ autoHighlight: true });

      render(service, { collection: without('apple'), autoHighlight: true });
      expect(highlighted(service)).toBeNull();
    });
  });

  it('decides every step as a pure transition, without commands of its own', () => {
    const props: ListboxProps = {
      collection: fruit,
      selectionMode: 'single',
      deselectable: false,
      selectOnHighlight: false,
      loopFocus: false,
      typeahead: true,
      highlightOnHover: true,
      autoHighlight: false,
      disabled: false,
      orientation: 'vertical',
    };
    const context: ListboxSchema['context'] = {
      value: [],
      highlightedValue: null,
      focused: false,
      collectionValues: fruit.values,
    };
    const step = (event: ListboxEvent, overrides: Partial<ListboxProps> = {}) => {
      const reads: MachineReadParams<ListboxSchema> = {
        prop: (key) => ({ ...props, ...overrides })[key],
        context: { get: (key) => context[key] },
        event,
      };
      return transition(listboxMachine, 'idle', event, reads);
    };
    expect(step(NEXT)).toStrictEqual({
      taken: true,
      state: 'idle',
      commands: run('highlightNext'),
    });
    expect(step(NEXT, { disabled: true }).taken).toBe(false);
    expect(step(typeahead('a'), { typeahead: false }).taken).toBe(false);
    expect(step(click('cherry')).commands).toStrictEqual(run('clickItem'));
    expect(step(click('blueberry')).taken).toBe(false);
    expect(step(hover('cherry'), { highlightOnHover: false }).taken).toBe(false);
    expect(step({ type: 'POINTER.LEAVE' }).commands).toStrictEqual(run('clearHighlightedValue'));
    expect(step({ type: 'BLUR' }).commands).toStrictEqual(
      run('clearFocused', 'clearHighlightedValue'),
    );
    expect(step({ type: 'CONTENT.FOCUS' }).commands).toStrictEqual(
      run('setFocused', 'highlightSelectedOrFirst'),
    );
  });
});
