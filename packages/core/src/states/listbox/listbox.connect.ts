import type { Service } from '../../machine/index.ts';
import type { ListboxApi, ListboxSchema } from './listbox.types.ts';

/**
 * The state and actions of a running listbox machine, as its parts need them: the items, the
 * selection, the highlight, the state of each item, and functions that send the events. No DOM
 * and no platform: an adapter turns the result into the props of its elements, and sends the
 * events of the user's input (focus, keys, the pointer) itself.
 *
 * Call it on every render: it reads the current snapshot and props.
 *
 * @example
 * const service = useMachine(listboxMachine, { collection }, platform);
 * const api = connect(service);
 * api.highlightNext();
 * api.getItemState(item).highlighted;
 */
export function connect(service: Service<ListboxSchema>): ListboxApi {
  const { send } = service;
  const collection = service.prop('collection');
  const value = service.context.get('value');
  const highlightedValue = service.context.get('highlightedValue');
  const disabled = service.prop('disabled');
  const selected = new Set(value);
  return {
    collection,
    value,
    selectedItems: value.flatMap((selectedValue) => {
      const item = collection.getItem(selectedValue);
      return item === null ? [] : [item];
    }),
    highlightedValue,
    highlightedItem: collection.getItem(highlightedValue),
    focused: service.context.get('focused'),
    disabled,
    multiple: service.prop('selectionMode') === 'multiple',
    orientation: service.prop('orientation'),
    getItemState: (item) => {
      const itemValue = collection.itemToValue(item);
      return {
        value: itemValue,
        disabled: disabled || collection.isItemDisabled(item),
        selected: selected.has(itemValue),
        highlighted: itemValue === highlightedValue,
      };
    },
    highlightValue: (next) => {
      send({ type: 'HIGHLIGHT.SET', value: next });
    },
    clearHighlightedValue: () => {
      send({ type: 'HIGHLIGHT.SET', value: null });
    },
    highlightFirst: () => {
      send({ type: 'HIGHLIGHT.FIRST' });
    },
    highlightLast: () => {
      send({ type: 'HIGHLIGHT.LAST' });
    },
    highlightNext: () => {
      send({ type: 'HIGHLIGHT.NEXT' });
    },
    highlightPrevious: () => {
      send({ type: 'HIGHLIGHT.PREVIOUS' });
    },
    selectValue: (next) => {
      send({ type: 'ITEM.SELECT', value: next });
    },
    setValue: (next) => {
      send({ type: 'VALUE.SET', value: next });
    },
    clearValue: (cleared) => {
      // The value of the moment of the call, not of the render that made this API.
      const current = service.context.get('value');
      send({
        type: 'VALUE.SET',
        value: cleared === undefined ? [] : current.filter((other) => other !== cleared),
      });
    },
  };
}
