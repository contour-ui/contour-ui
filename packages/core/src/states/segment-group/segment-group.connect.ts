import type { Service } from '../../machine/index.ts';
import type { SegmentGroupApi, SegmentGroupSchema } from './segment-group.types.ts';

/**
 * The state and actions of a running segment group machine, as its parts need them: the checked
 * value, the focused item, the props of the group, the state of each item, and functions that
 * send the events. No DOM and no platform.
 *
 * Call it on every render: it reads the current snapshot.
 *
 * @example
 * const api = connect(service);
 * api.getItemState({ value: 'day' }).checked; // true
 * api.checkItem({ value: 'week' });
 */
export function connect(service: Service<SegmentGroupSchema>): SegmentGroupApi {
  const value = service.context.get('value');
  const focusedValue = service.context.get('focusedValue');
  const focusVisible = service.context.get('focusVisible');
  const disabled = service.prop('disabled');
  return {
    value,
    focusedValue,
    disabled,
    readOnly: service.prop('readOnly'),
    orientation: service.prop('orientation'),
    setValue: (next) => {
      service.send({ type: 'VALUE.SET', value: next });
    },
    checkItem: (item) => {
      service.send({ type: 'ITEM.CHECK', value: item.value, disabled: item.disabled === true });
    },
    focusItem: (next, visible) => {
      service.send({ type: 'ITEM.FOCUS', value: next, focusVisible: visible });
    },
    blurItem: () => {
      service.send({ type: 'ITEM.BLUR' });
    },
    getItemState: (item) => {
      const focused = focusedValue === item.value;
      return {
        value: item.value,
        checked: value === item.value,
        disabled: disabled || item.disabled === true,
        focused,
        focusVisible: focused && focusVisible,
      };
    },
  };
}
