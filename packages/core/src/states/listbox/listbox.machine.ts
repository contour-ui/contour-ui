import type { ListCollection } from '../../collection/index.ts';
import { createMachine } from '../../machine/index.ts';
import type { Machine, MachineParams, MachineReadParams } from '../../machine/index.ts';
import type { ListboxSchema } from './listbox.types.ts';

type Params = MachineParams<ListboxSchema>;

/** Whether two lists of values hold the same values in the same order. */
const sameValues = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

/** Whether the collection has an enabled item with this value. */
function isEnabled(collection: ListCollection<unknown>, value: string | null): boolean {
  const item = collection.getItem(value);
  return item !== null && !collection.isItemDisabled(item);
}

/** The item value an event carries: the one of `ITEM.CLICK`, `ITEM.SELECT` or `ITEM.HOVER`. */
function itemValue(event: MachineReadParams<ListboxSchema>['event']): string | null {
  return event.type === 'ITEM.CLICK' || event.type === 'ITEM.SELECT' || event.type === 'ITEM.HOVER'
    ? event.value
    : null;
}

/** The value after the user selects `value`, by the selection mode. */
function selectionAfter({ prop, context }: Params, value: string): readonly string[] {
  const current = context.get('value');
  const selected = current.includes(value);
  if (prop('selectionMode') === 'multiple') {
    return selected ? current.filter((other) => other !== value) : [...current, value];
  }
  return selected && prop('deselectable') ? [] : [value];
}

/**
 * Select the item with `value` as the user does: replace a single selection (or clear it, with
 * `deselectable`, when the item is the selected one), toggle the item in a multiple one. The
 * item is reported through `onSelect` when it ends up selected. A disabled item is ignored.
 */
function select(params: Params, value: string): void {
  const { prop, context } = params;
  const collection = prop('collection');
  const item = collection.getItem(value);
  if (item === null || collection.isItemDisabled(item)) {
    return;
  }
  const next = selectionAfter(params, value);
  context.set('value', next);
  if (next.includes(value)) {
    prop('onSelect')?.({ value, item });
  }
}

/**
 * Move the highlight as a key does: nowhere for `null` (no item to go to). With
 * `selectOnHighlight`, in a single selection, select the item too, unless the key left the
 * highlight on an item that is selected already.
 */
function moveHighlight(params: Params, value: string | null): void {
  const { prop, context } = params;
  if (value === null) {
    return;
  }
  const moved = value !== context.get('highlightedValue');
  context.set('highlightedValue', value);
  if (
    prop('selectOnHighlight') &&
    prop('selectionMode') === 'single' &&
    (moved || !context.get('value').includes(value))
  ) {
    select(params, value);
  }
}

/**
 * The listbox machine: a list of items, the highlighted one (which the keyboard acts on) and
 * the selected ones. It has one state, `idle`; everything it does changes its context. The
 * items are a list collection (`createListCollection`), which navigation and typeahead follow.
 *
 * - `HIGHLIGHT.FIRST` / `LAST` / `NEXT` / `PREVIOUS` move the highlight to an enabled item;
 *   past an end, `NEXT` and `PREVIOUS` stop, or wrap around with `loopFocus`. From no
 *   highlight, `NEXT` goes to the first item and `PREVIOUS` to the last. With
 *   `selectOnHighlight`, a single selection follows them, and `TYPEAHEAD` too.
 * - `TYPEAHEAD` highlights the item the query matches (`search` of the collection), unless
 *   `typeahead` is off.
 * - `ITEM.CLICK` highlights and selects an item, `ITEM.SELECT` selects it, `HIGHLIGHTED.SELECT`
 *   selects the highlighted one: a single selection is replaced (cleared with `deselectable`
 *   when the item was selected), a multiple one toggles the item. `onSelect` reports an item
 *   that ends up selected.
 * - `ITEM.HOVER` highlights the item under the pointer with `highlightOnHover`; `POINTER.LEAVE`
 *   clears that highlight while the listbox has no focus.
 * - `CONTENT.FOCUS` highlights the first selected item, or else the first item, unless an item
 *   is highlighted. `INPUT.FOCUS` highlights the first item with `autoHighlight`. `BLUR` clears
 *   the highlight: it is the focus of the list, and the list has none.
 * - New items (a collection with other values): with `autoHighlight`, while the listbox has
 *   focus, the first item is highlighted; otherwise a highlighted item that is gone is cleared.
 * - `disabled` ignores every event but `VALUE.SET`, `HIGHLIGHT.SET` and the focus events. The
 *   item of an event must be enabled.
 *
 * Nothing touches the environment: there are no platform actions, effects or delays.
 *
 * @example
 * const service = createService(listboxMachine, { props: { collection }, platform });
 * service.start();
 * service.send({ type: 'HIGHLIGHT.NEXT' });
 * service.send({ type: 'HIGHLIGHTED.SELECT' });
 */
export const listboxMachine: Machine<ListboxSchema> = createMachine<ListboxSchema>({
  props: ({
    selectionMode = 'single',
    deselectable = false,
    selectOnHighlight = false,
    loopFocus = false,
    typeahead = true,
    highlightOnHover = true,
    autoHighlight = false,
    disabled = false,
    orientation = 'vertical',
    ...input
  }) => ({
    ...input,
    selectionMode,
    deselectable,
    selectOnHighlight,
    loopFocus,
    typeahead,
    highlightOnHover,
    autoHighlight,
    disabled,
    orientation,
  }),
  context: {
    value: ({ prop }) => ({
      value: prop('value'),
      defaultValue: prop('defaultValue') ?? [],
      isEqual: sameValues,
      onChange: (value) => {
        const collection = prop('collection');
        prop('onValueChange')?.({
          value: [...value],
          items: value.flatMap((selected) => {
            const item = collection.getItem(selected);
            return item === null ? [] : [item];
          }),
        });
      },
    }),
    highlightedValue: ({ prop }) => ({
      value: prop('highlightedValue'),
      defaultValue: prop('defaultHighlightedValue') ?? null,
      onChange: (highlightedValue) => {
        const collection = prop('collection');
        prop('onHighlightChange')?.({
          highlightedValue,
          highlightedItem: collection.getItem(highlightedValue),
          highlightedIndex: collection.indexOf(highlightedValue),
        });
      },
    }),
    focused: () => ({ defaultValue: false }),
    collectionValues: ({ prop }) => ({
      defaultValue: prop('collection').values,
      isEqual: sameValues,
    }),
  },
  initial: 'idle',
  states: {
    idle: {},
  },
  on: {
    'HIGHLIGHT.FIRST': { guard: 'interactive', actions: ['highlightFirst'] },
    'HIGHLIGHT.LAST': { guard: 'interactive', actions: ['highlightLast'] },
    'HIGHLIGHT.NEXT': { guard: 'interactive', actions: ['highlightNext'] },
    'HIGHLIGHT.PREVIOUS': { guard: 'interactive', actions: ['highlightPrevious'] },
    'HIGHLIGHT.SET': { actions: ['setHighlightedValue'] },
    TYPEAHEAD: { guard: 'typeaheadEnabled', actions: ['highlightMatch'] },
    'ITEM.HOVER': { guard: 'hoverEnabled', actions: ['setHighlightedValue'] },
    'POINTER.LEAVE': { guard: 'leavingUnfocused', actions: ['clearHighlightedValue'] },
    'ITEM.CLICK': { guard: 'itemEnabled', actions: ['clickItem'] },
    'ITEM.SELECT': { guard: 'itemEnabled', actions: ['selectItem'] },
    'HIGHLIGHTED.SELECT': { guard: 'interactive', actions: ['selectHighlighted'] },
    'VALUE.SET': { actions: ['setValue'] },
    'CONTENT.FOCUS': { actions: ['setFocused', 'highlightSelectedOrFirst'] },
    'INPUT.FOCUS': { actions: ['setFocused', 'highlightFirstWhileTyping'] },
    BLUR: { actions: ['clearFocused', 'clearHighlightedValue'] },
  },
  watch: {
    collection: ['syncCollection'],
  },
  actions: {
    highlightFirst: (params) => {
      moveHighlight(params, params.prop('collection').firstValue);
    },
    highlightLast: (params) => {
      moveHighlight(params, params.prop('collection').lastValue);
    },
    highlightNext: (params) => {
      const { prop, context } = params;
      const loop = prop('loopFocus');
      moveHighlight(
        params,
        prop('collection').getNextValue(context.get('highlightedValue'), { loop }),
      );
    },
    highlightPrevious: (params) => {
      const { prop, context } = params;
      const loop = prop('loopFocus');
      moveHighlight(
        params,
        prop('collection').getPreviousValue(context.get('highlightedValue'), { loop }),
      );
    },
    highlightMatch: (params) => {
      const { prop, context, event } = params;
      if (event.type === 'TYPEAHEAD') {
        const from = context.get('highlightedValue');
        moveHighlight(params, prop('collection').search(event.query, { from }));
      }
    },
    setHighlightedValue: ({ context, event }) => {
      if (event.type === 'HIGHLIGHT.SET' || event.type === 'ITEM.HOVER') {
        context.set('highlightedValue', event.value);
      }
    },
    clearHighlightedValue: ({ context }) => {
      context.set('highlightedValue', null);
    },
    clickItem: (params) => {
      const { context, event } = params;
      if (event.type === 'ITEM.CLICK') {
        context.set('highlightedValue', event.value);
        select(params, event.value);
      }
    },
    selectItem: (params) => {
      if (params.event.type === 'ITEM.SELECT') {
        select(params, params.event.value);
      }
    },
    selectHighlighted: (params) => {
      const highlighted = params.context.get('highlightedValue');
      if (highlighted !== null) {
        select(params, highlighted);
      }
    },
    setValue: ({ context, event }) => {
      if (event.type === 'VALUE.SET') {
        context.set('value', event.value);
      }
    },
    setFocused: ({ context }) => {
      context.set('focused', true);
    },
    clearFocused: ({ context }) => {
      context.set('focused', false);
    },
    highlightSelectedOrFirst: ({ prop, context }) => {
      const collection = prop('collection');
      if (prop('disabled') || collection.has(context.get('highlightedValue'))) {
        return;
      }
      const selected = context.get('value');
      const first = collection.values.find(
        (value) => selected.includes(value) && isEnabled(collection, value),
      );
      context.set('highlightedValue', first ?? collection.firstValue);
    },
    highlightFirstWhileTyping: ({ prop, context }) => {
      const collection = prop('collection');
      if (
        !prop('autoHighlight') ||
        prop('disabled') ||
        collection.has(context.get('highlightedValue'))
      ) {
        return;
      }
      context.set('highlightedValue', collection.firstValue);
    },
    syncCollection: ({ prop, context }) => {
      const collection = prop('collection');
      if (sameValues(context.get('collectionValues'), collection.values)) {
        return;
      }
      context.set('collectionValues', collection.values);
      if (prop('autoHighlight') && context.get('focused') && !prop('disabled')) {
        context.set('highlightedValue', collection.firstValue);
      } else if (!collection.has(context.get('highlightedValue'))) {
        context.set('highlightedValue', null);
      }
    },
  },
  guards: {
    interactive: ({ prop }) => !prop('disabled'),
    typeaheadEnabled: ({ prop }) => !prop('disabled') && prop('typeahead'),
    itemEnabled: ({ prop, event }) =>
      !prop('disabled') && isEnabled(prop('collection'), itemValue(event)),
    hoverEnabled: ({ prop, event }) =>
      prop('highlightOnHover') &&
      !prop('disabled') &&
      isEnabled(prop('collection'), itemValue(event)),
    leavingUnfocused: ({ prop, context }) => prop('highlightOnHover') && !context.get('focused'),
  },
  delays: {},
});
