import { describe, expect, it } from 'vite-plus/test';

import { createListCollection } from '../../collection/index.ts';
import { createService, createTestPlatform } from '../../machine/index.ts';
import { connect } from './listbox.connect.ts';
import { listboxMachine } from './listbox.machine.ts';
import type { ListboxInput } from './listbox.types.ts';

const KICK = { value: 'kick', label: 'Kick' };
const SNARE = { value: 'snare', label: 'Snare', disabled: true };
const HAT = { value: 'hat', label: 'Hi-hat' };
const TOM = { value: 'tom', label: 'Tom' };

const drums = createListCollection({ items: [KICK, SNARE, HAT, TOM] });

function listbox(props: Partial<ListboxInput> = {}) {
  const test = createTestPlatform(listboxMachine);
  const service = createService(listboxMachine, {
    props: { collection: drums, ...props },
    platform: test.platform,
  });
  service.start();
  return service;
}

describe('listbox connect', () => {
  it('reads the items, the selection and the highlight of the service', () => {
    const service = listbox({
      selectionMode: 'multiple',
      defaultValue: ['tom', 'cowbell', 'kick'],
      defaultHighlightedValue: 'hat',
      orientation: 'horizontal',
    });

    const api = connect(service);
    expect(api.collection).toBe(drums);
    expect(api.value).toStrictEqual(['tom', 'cowbell', 'kick']);
    // In the order of the value; the cowbell is not in the collection.
    expect(api.selectedItems).toStrictEqual([TOM, KICK]);
    expect([api.highlightedValue, api.highlightedItem]).toStrictEqual(['hat', HAT]);
    expect([api.focused, api.disabled, api.multiple, api.orientation]).toStrictEqual([
      false,
      false,
      true,
      'horizontal',
    ]);
  });

  it('gives the state of each item', () => {
    const api = connect(listbox({ defaultValue: ['kick'], defaultHighlightedValue: 'hat' }));

    expect([KICK, SNARE, HAT, TOM].map((item) => api.getItemState(item))).toStrictEqual([
      { value: 'kick', disabled: false, selected: true, highlighted: false },
      { value: 'snare', disabled: true, selected: false, highlighted: false },
      { value: 'hat', disabled: false, selected: false, highlighted: true },
      { value: 'tom', disabled: false, selected: false, highlighted: false },
    ]);
    // A disabled listbox disables every item.
    const disabled = connect(listbox({ disabled: true }));
    expect(disabled.getItemState(KICK).disabled).toBe(true);
  });

  it('has no highlighted item for a highlighted value that is not in the collection', () => {
    const api = connect(listbox({ defaultHighlightedValue: 'cowbell' }));

    expect([api.highlightedValue, api.highlightedItem]).toStrictEqual(['cowbell', null]);
  });

  it('sends the events of its functions', () => {
    const service = listbox({ selectionMode: 'multiple' });
    const api = connect(service);

    api.highlightLast();
    expect(connect(service).highlightedValue).toBe('tom');
    api.highlightPrevious();
    expect(connect(service).highlightedValue).toBe('hat');
    api.highlightFirst();
    expect(connect(service).highlightedValue).toBe('kick');
    api.highlightNext();
    expect(connect(service).highlightedValue).toBe('hat');
    api.highlightValue('tom');
    expect(connect(service).highlightedValue).toBe('tom');
    api.clearHighlightedValue();
    expect(connect(service).highlightedValue).toBeNull();

    api.selectValue('kick');
    api.selectValue('tom');
    expect(connect(service).value).toStrictEqual(['kick', 'tom']);
    api.setValue(['hat']);
    expect(connect(service).value).toStrictEqual(['hat']);
    // An API holds the values of the moment it was made: connect again after a change.
    expect(api.value).toStrictEqual([]);
  });

  it('clears one value or all of them, from the value of the moment of the call', () => {
    const service = listbox({ selectionMode: 'multiple', defaultValue: ['kick', 'hat', 'tom'] });
    const api = connect(service);

    api.clearValue('hat');
    expect(connect(service).value).toStrictEqual(['kick', 'tom']);
    // `api` was made before the first call, and still clears from the current value.
    api.clearValue('kick');
    expect(connect(service).value).toStrictEqual(['tom']);
    api.clearValue();
    expect(connect(service).value).toStrictEqual([]);
  });
});
