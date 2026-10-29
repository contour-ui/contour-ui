import { describe, expect, it, vi } from 'vite-plus/test';

import { createService, createTestPlatform } from '../../machine/index.ts';
import { connect } from './segment-group.connect.ts';
import { segmentGroupMachine } from './segment-group.machine.ts';
import type { SegmentGroupInput, SegmentGroupValueChangeDetails } from './segment-group.types.ts';

function service(props: SegmentGroupInput) {
  const test = createTestPlatform(segmentGroupMachine);
  const running = createService(segmentGroupMachine, { props, platform: test.platform });
  running.start();
  return running;
}

describe('segment group connect', () => {
  it('reads the value and the props, and sends the events', () => {
    const onValueChange = vi.fn<(details: SegmentGroupValueChangeDetails) => void>();
    const running = service({ defaultValue: 'day', orientation: 'vertical', onValueChange });

    const api = connect(running);
    expect(api).toMatchObject({
      value: 'day',
      focusedValue: null,
      disabled: false,
      readOnly: false,
      orientation: 'vertical',
    });

    api.checkItem({ value: 'week' });
    expect(connect(running).value).toBe('week');
    api.checkItem({ value: 'month', disabled: true });
    expect(connect(running).value).toBe('week');
    api.setValue(null);
    expect(connect(running).value).toBeNull();
    expect(onValueChange.mock.calls).toStrictEqual([[{ value: 'week' }], [{ value: null }]]);

    api.focusItem('day', true);
    expect(connect(running).focusedValue).toBe('day');
    api.blurItem();
    expect(connect(running).focusedValue).toBeNull();
  });

  it('gives the state of each item', () => {
    const running = service({ defaultValue: 'day' });
    connect(running).focusItem('day', true);

    const api = connect(running);
    expect(api.getItemState({ value: 'day' })).toStrictEqual({
      value: 'day',
      checked: true,
      disabled: false,
      focused: true,
      focusVisible: true,
    });
    expect(api.getItemState({ value: 'week', disabled: true })).toStrictEqual({
      value: 'week',
      checked: false,
      disabled: true,
      focused: false,
      focusVisible: false,
    });

    running.setProps({ defaultValue: 'day', disabled: true });
    expect(connect(running).getItemState({ value: 'month' }).disabled).toBe(true);
  });
});
