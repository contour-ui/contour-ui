import { createMachine } from '../../machine/index.ts';
import type { Machine, MachineParams } from '../../machine/index.ts';
import { isTriggerEnabled, triggerCollection } from './tabs.triggers.ts';
import type { TabsSchema } from './tabs.types.ts';

type Params = MachineParams<TabsSchema>;

/**
 * Where a step of focus starts: the focused trigger, else the selected one. From neither, a step
 * forward goes to the first trigger and a step back to the last.
 */
function focusOrigin({ context }: Params): string | null {
  return context.get('focusedValue') ?? context.get('value');
}

/** Move focus to `value` (nowhere for `null`: no trigger to go to). */
function moveFocus({ context }: Params, value: string | null): void {
  if (value !== null) {
    context.set('focusedValue', value);
  }
}

/**
 * The tabs machine: which tab is selected, and which trigger has focus. It has one state, `idle`;
 * everything it does changes its context. The triggers come from the adapter (`triggers`), in
 * the order the keyboard moves through them.
 *
 * - `FOCUS.FIRST` / `LAST` / `NEXT` / `PREVIOUS` move focus to an enabled trigger, from the
 *   focused one or else the selected one; past an end, `NEXT` and `PREVIOUS` wrap around with
 *   `loopFocus` (on by default) and stop otherwise. The platform focuses the trigger
 *   (`focusTrigger`), and the `automatic` mode selects its tab.
 * - `TRIGGER.FOCUS` records the focused trigger, without selecting: Tab lands on the selected
 *   trigger anyway, and a click selects by itself (once, also for an owner who refuses it).
 *   `FOCUS.SET` moves focus without selecting either. `BLUR` clears the focused trigger.
 * - `TRIGGER.CLICK` selects the tab of an enabled trigger, in either mode: a click, Enter or
 *   Space. `VALUE.SET` selects any value, also one without a trigger or with a disabled one.
 * - A trigger the adapter has not reported counts as enabled.
 *
 * @example
 * const service = createService(tabsMachine, { props: { triggers, defaultValue: 'mix' }, platform });
 * service.start();
 * service.send({ type: 'FOCUS.NEXT' });
 */
export const tabsMachine: Machine<TabsSchema> = createMachine<TabsSchema>({
  props: ({
    triggers = [],
    orientation = 'horizontal',
    activationMode = 'automatic',
    loopFocus = true,
    ...input
  }) => ({ ...input, triggers, orientation, activationMode, loopFocus }),
  context: {
    value: ({ prop }) => ({
      value: prop('value'),
      defaultValue: prop('defaultValue') ?? null,
      onChange: (value) => {
        // A selection is always of a tab: the context never goes back to `null` by itself.
        if (value !== null) {
          prop('onValueChange')?.({ value });
        }
      },
    }),
    focusedValue: ({ prop }) => ({
      defaultValue: null,
      onChange: (focusedValue) => {
        prop('onFocusChange')?.({ focusedValue });
      },
    }),
  },
  initial: 'idle',
  states: {
    idle: {},
  },
  on: {
    'FOCUS.FIRST': { actions: ['focusFirst', 'focusTrigger', 'selectFocusedAutomatically'] },
    'FOCUS.LAST': { actions: ['focusLast', 'focusTrigger', 'selectFocusedAutomatically'] },
    'FOCUS.NEXT': { actions: ['focusNext', 'focusTrigger', 'selectFocusedAutomatically'] },
    'FOCUS.PREVIOUS': {
      actions: ['focusPrevious', 'focusTrigger', 'selectFocusedAutomatically'],
    },
    'FOCUS.SET': { guard: 'triggerEnabled', actions: ['setFocusedValue', 'focusTrigger'] },
    'TRIGGER.FOCUS': { actions: ['setFocusedValue'] },
    BLUR: { actions: ['clearFocusedValue'] },
    'TRIGGER.CLICK': { guard: 'triggerEnabled', actions: ['selectEventValue'] },
    'VALUE.SET': { actions: ['selectEventValue'] },
  },
  actions: {
    focusFirst: (params) => {
      moveFocus(params, triggerCollection(params.prop('triggers')).firstValue);
    },
    focusLast: (params) => {
      moveFocus(params, triggerCollection(params.prop('triggers')).lastValue);
    },
    focusNext: (params) => {
      const collection = triggerCollection(params.prop('triggers'));
      const loop = params.prop('loopFocus');
      moveFocus(params, collection.getNextValue(focusOrigin(params), { loop }));
    },
    focusPrevious: (params) => {
      const collection = triggerCollection(params.prop('triggers'));
      const loop = params.prop('loopFocus');
      moveFocus(params, collection.getPreviousValue(focusOrigin(params), { loop }));
    },
    setFocusedValue: ({ context, event }) => {
      if (event.type === 'FOCUS.SET' || event.type === 'TRIGGER.FOCUS') {
        context.set('focusedValue', event.value);
      }
    },
    clearFocusedValue: ({ context }) => {
      context.set('focusedValue', null);
    },
    selectFocusedAutomatically: ({ prop, context }) => {
      const focused = context.get('focusedValue');
      if (
        prop('activationMode') === 'automatic' &&
        focused !== null &&
        isTriggerEnabled(triggerCollection(prop('triggers')), focused)
      ) {
        context.set('value', focused);
      }
    },
    selectEventValue: ({ context, event }) => {
      if (event.type === 'TRIGGER.CLICK' || event.type === 'VALUE.SET') {
        context.set('value', event.value);
      }
    },
  },
  guards: {
    triggerEnabled: ({ prop, event }) =>
      (event.type === 'TRIGGER.CLICK' || event.type === 'FOCUS.SET') &&
      isTriggerEnabled(triggerCollection(prop('triggers')), event.value),
  },
  delays: {},
});
