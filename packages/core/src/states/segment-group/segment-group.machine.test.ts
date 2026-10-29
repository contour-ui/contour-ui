import { describe, expect, it, vi } from 'vite-plus/test';

import { createService, createTestPlatform } from '../../machine/index.ts';
import { segmentGroupMachine } from './segment-group.machine.ts';
import type { SegmentGroupInput, SegmentGroupValueChangeDetails } from './segment-group.types.ts';

/** A started segment group on the test platform. */
function group(props: SegmentGroupInput = {}) {
  const test = createTestPlatform(segmentGroupMachine);
  const service = createService(segmentGroupMachine, { props, platform: test.platform });
  service.start();
  return { service, test };
}

const valueSpy = () => vi.fn<(details: SegmentGroupValueChangeDetails) => void>();

describe('segment group machine', () => {
  it('starts with no value, horizontal, enabled and editable', () => {
    const { service, test } = group();

    expect(service.matches('idle')).toBe(true);
    expect(service.context.get('value')).toBeNull();
    expect(service.context.get('focusedValue')).toBeNull();
    expect(service.prop('orientation')).toBe('horizontal');
    expect(service.prop('disabled')).toBe(false);
    expect(service.prop('readOnly')).toBe(false);
    expect(test.log).toStrictEqual([]);
  });

  it('checks an item and reports the value once', () => {
    const onValueChange = valueSpy();
    const { service } = group({ defaultValue: 'day', onValueChange });

    service.send({ type: 'ITEM.CHECK', value: 'week' });
    expect(service.context.get('value')).toBe('week');
    expect(onValueChange.mock.calls).toStrictEqual([[{ value: 'week' }]]);

    service.send({ type: 'ITEM.CHECK', value: 'week' });
    expect(onValueChange).toHaveBeenCalledOnce();
  });

  it('ignores checks of a disabled item, a disabled group and a read-only group', () => {
    const onValueChange = valueSpy();
    const { service } = group({ defaultValue: 'day', onValueChange });

    service.send({ type: 'ITEM.CHECK', value: 'week', disabled: true });
    expect(service.context.get('value')).toBe('day');

    service.setProps({ defaultValue: 'day', onValueChange, disabled: true });
    service.send({ type: 'ITEM.CHECK', value: 'week' });
    expect(service.context.get('value')).toBe('day');

    service.setProps({ defaultValue: 'day', onValueChange, readOnly: true });
    service.send({ type: 'ITEM.CHECK', value: 'week' });
    expect(service.context.get('value')).toBe('day');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('sets the value from code whatever disabled and readOnly say', () => {
    const { service } = group({ defaultValue: 'day', disabled: true, readOnly: true });

    service.send({ type: 'VALUE.SET', value: 'month' });
    expect(service.context.get('value')).toBe('month');
    service.send({ type: 'VALUE.SET', value: null });
    expect(service.context.get('value')).toBeNull();
  });

  it('only reports a check of a controlled value', () => {
    const onValueChange = valueSpy();
    const { service } = group({ value: 'day', onValueChange });

    service.send({ type: 'ITEM.CHECK', value: 'week' });
    expect(onValueChange.mock.calls).toStrictEqual([[{ value: 'week' }]]);
    expect(service.context.get('value')).toBe('day');

    service.setProps({ value: 'week', onValueChange });
    expect(service.context.get('value')).toBe('week');
  });

  it('tracks the focused item and its focus ring', () => {
    const { service } = group();

    service.send({ type: 'ITEM.FOCUS', value: 'day', focusVisible: true });
    expect(service.context.get('focusedValue')).toBe('day');
    expect(service.context.get('focusVisible')).toBe(true);

    service.send({ type: 'ITEM.FOCUS', value: 'week', focusVisible: false });
    expect(service.context.get('focusedValue')).toBe('week');
    expect(service.context.get('focusVisible')).toBe(false);

    service.send({ type: 'ITEM.BLUR' });
    expect(service.context.get('focusedValue')).toBeNull();
    expect(service.context.get('focusVisible')).toBe(false);
  });
});
