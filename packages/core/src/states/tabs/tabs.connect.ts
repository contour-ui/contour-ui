import type { Service } from '../../machine/index.ts';
import { tabStopOf, triggerCollection } from './tabs.triggers.ts';
import type { TabsApi, TabsSchema } from './tabs.types.ts';

/**
 * The state and actions of a running tabs machine, as its parts need them: the selected tab,
 * the focused trigger, the trigger that Tab reaches, the state of each trigger and content, and
 * functions that send the events. No DOM and no platform: an adapter turns the result into the
 * props of its elements, and sends the events of the user's input (focus, keys, clicks) itself.
 *
 * Call it on every render: it reads the current snapshot and props.
 *
 * @example
 * const service = useMachine(tabsMachine, { triggers, defaultValue: 'mix' }, platform);
 * const api = connect(service);
 * api.getTriggerState({ value: 'mix' }).selected; // true
 */
export function connect(service: Service<TabsSchema>): TabsApi {
  const { send } = service;
  const collection = triggerCollection(service.prop('triggers'));
  const value = service.context.get('value');
  const focusedValue = service.context.get('focusedValue');
  const tabStopValue = tabStopOf(collection, value);
  return {
    value,
    focusedValue,
    triggers: collection.items,
    tabStopValue,
    orientation: service.prop('orientation'),
    activationMode: service.prop('activationMode'),
    getTriggerState: (trigger) => ({
      value: trigger.value,
      selected: trigger.value === value,
      focused: trigger.value === focusedValue,
      disabled: trigger.disabled === true,
      tabStop: trigger.value === tabStopValue && trigger.disabled !== true,
    }),
    getContentState: (content) => ({
      value: content.value,
      selected: content.value === value,
    }),
    setValue: (next) => {
      send({ type: 'VALUE.SET', value: next });
    },
    focus: (next) => {
      send({ type: 'FOCUS.SET', value: next });
    },
    focusFirst: () => {
      send({ type: 'FOCUS.FIRST' });
    },
    focusLast: () => {
      send({ type: 'FOCUS.LAST' });
    },
    focusNext: () => {
      send({ type: 'FOCUS.NEXT' });
    },
    focusPrevious: () => {
      send({ type: 'FOCUS.PREVIOUS' });
    },
  };
}
