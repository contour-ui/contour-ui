import { createMachine } from '../../machine/index.ts';
import type { Machine } from '../../machine/index.ts';
import type { SegmentGroupSchema } from './segment-group.types.ts';

/**
 * The segment group machine: a set of items of which at most one is checked, as a group of radio
 * buttons. It has a single state; its context holds the checked value, controlled or owned, and
 * the focused item.
 *
 * - `ITEM.CHECK` checks an item, unless the group is disabled or read-only, or the item is
 *   disabled. Checking the checked item again changes nothing.
 * - `VALUE.SET` changes the value from code, whatever `disabled` and `readOnly` say.
 * - `ITEM.FOCUS` and `ITEM.BLUR` track the focused item and whether it shows a focus ring.
 *
 * Keyboard movement belongs to the platform: on the DOM, native radio buttons move focus and the
 * check with the arrow keys, and report each check as `ITEM.CHECK`.
 *
 * @example
 * const service = createService(segmentGroupMachine, { props: { defaultValue: 'day' }, platform });
 * service.start();
 * service.send({ type: 'ITEM.CHECK', value: 'week' });
 */
export const segmentGroupMachine: Machine<SegmentGroupSchema> = createMachine<SegmentGroupSchema>({
  props: ({ disabled = false, readOnly = false, orientation = 'horizontal', ...input }) => ({
    ...input,
    disabled,
    readOnly,
    orientation,
  }),
  context: {
    value: ({ prop }) => ({
      value: prop('value'),
      defaultValue: prop('defaultValue') ?? null,
      onChange: (value) => prop('onValueChange')?.({ value }),
    }),
    focusedValue: () => ({ defaultValue: null }),
    focusVisible: () => ({ defaultValue: false }),
  },
  initial: 'idle',
  states: {
    idle: {
      on: {
        'ITEM.CHECK': { guard: 'canCheck', actions: ['checkItem'] },
        'ITEM.FOCUS': { actions: ['focusItem'] },
        'ITEM.BLUR': { actions: ['blurItem'] },
        'VALUE.SET': { actions: ['setValue'] },
      },
    },
  },
  actions: {
    checkItem: ({ context, event }) => {
      if (event.type === 'ITEM.CHECK') {
        context.set('value', event.value);
      }
    },
    setValue: ({ context, event }) => {
      if (event.type === 'VALUE.SET') {
        context.set('value', event.value);
      }
    },
    focusItem: ({ context, event }) => {
      if (event.type === 'ITEM.FOCUS') {
        context.set('focusedValue', event.value);
        context.set('focusVisible', event.focusVisible);
      }
    },
    blurItem: ({ context }) => {
      context.set('focusedValue', null);
      context.set('focusVisible', false);
    },
  },
  guards: {
    canCheck: ({ prop, event }) =>
      event.type === 'ITEM.CHECK' &&
      event.disabled !== true &&
      !prop('disabled') &&
      !prop('readOnly'),
  },
  delays: {},
});
