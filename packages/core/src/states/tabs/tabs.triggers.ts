import { createListCollection } from '../../collection/index.ts';
import type { ListCollection } from '../../collection/index.ts';
import type { TabsTrigger } from './tabs.types.ts';

/** The triggers as a list collection, one per value: the first of two with one value counts. */
export function triggerCollection(triggers: readonly TabsTrigger[]): ListCollection<TabsTrigger> {
  const seen = new Set<string>();
  const unique = triggers.filter((trigger) => {
    if (seen.has(trigger.value)) {
      return false;
    }
    seen.add(trigger.value);
    return true;
  });
  return createListCollection<TabsTrigger>({
    items: unique,
    itemToValue: (trigger) => trigger.value,
    isItemDisabled: (trigger) => trigger.disabled === true,
  });
}

/**
 * Whether the trigger of `value` takes input: it is not known to be disabled. A value without a
 * trigger counts as enabled, so tabs whose adapter has not reported its triggers yet still work.
 */
export function isTriggerEnabled(collection: ListCollection<TabsTrigger>, value: string): boolean {
  const trigger = collection.getItem(value);
  return trigger === null || !collection.isItemDisabled(trigger);
}

/**
 * The trigger that Tab reaches: the one of the selected tab when it is enabled, else the first
 * enabled trigger; `null` when there is none. Before the adapter reports any trigger (a first
 * render, on a server), the selected tab's trigger is assumed to be there, enabled.
 */
export function tabStopOf(
  collection: ListCollection<TabsTrigger>,
  value: string | null,
): string | null {
  if (collection.size === 0) {
    return value;
  }
  const selected = collection.getItem(value);
  if (selected !== null && !collection.isItemDisabled(selected)) {
    return collection.itemToValue(selected);
  }
  return collection.firstValue;
}
