import { describe, expect, it } from 'vite-plus/test';

import { createService, createTestPlatform } from '../../machine/index.ts';
import { connect } from './tabs.connect.ts';
import { tabsMachine } from './tabs.machine.ts';
import type { TabsInput, TabsTrigger } from './tabs.types.ts';

const MIX = { value: 'mix' };
const SENDS = { value: 'sends', disabled: true };
const MASTER = { value: 'master' };

function tabs(props: Partial<TabsInput> = {}) {
  const test = createTestPlatform(tabsMachine);
  const service = createService(tabsMachine, {
    props: { triggers: [MIX, SENDS, MASTER], ...props },
    platform: test.platform,
  });
  service.start();
  return { service, log: test.log };
}

const tabStops = (triggers: readonly TabsTrigger[], value?: string) =>
  connect(tabs({ triggers, defaultValue: value }).service).tabStopValue;

describe('tabs connect', () => {
  it('reads the selection, the focus and the props of the service', () => {
    const { service } = tabs({
      defaultValue: 'master',
      orientation: 'vertical',
      activationMode: 'manual',
    });
    service.send({ type: 'TRIGGER.FOCUS', value: 'mix' });

    const api = connect(service);
    expect([api.value, api.focusedValue, api.orientation, api.activationMode]).toStrictEqual([
      'master',
      'mix',
      'vertical',
      'manual',
    ]);
    expect(api.triggers).toStrictEqual([MIX, SENDS, MASTER]);
  });

  it('gives the state of each trigger and content', () => {
    const { service } = tabs({ defaultValue: 'mix', activationMode: 'manual' });
    service.send({ type: 'TRIGGER.FOCUS', value: 'master' });
    const api = connect(service);

    expect([MIX, SENDS, MASTER].map((trigger) => api.getTriggerState(trigger))).toStrictEqual([
      { value: 'mix', selected: true, focused: false, disabled: false, tabStop: true },
      { value: 'sends', selected: false, focused: false, disabled: true, tabStop: false },
      { value: 'master', selected: false, focused: true, disabled: false, tabStop: false },
    ]);
    expect(api.getContentState({ value: 'mix' })).toStrictEqual({ value: 'mix', selected: true });
    expect(api.getContentState({ value: 'sends' }).selected).toBe(false);
  });

  it('puts the tab stop on the selected trigger, or else on the first enabled one', () => {
    expect(tabStops([MIX, SENDS, MASTER], 'master')).toBe('master');
    // No selection, a value without a trigger, a disabled selected trigger.
    expect(tabStops([SENDS, MASTER, MIX])).toBe('master');
    expect(tabStops([MIX, MASTER], 'gone')).toBe('mix');
    expect(tabStops([MIX, SENDS, MASTER], 'sends')).toBe('mix');
    expect(tabStops([SENDS])).toBeNull();
    // Before the triggers are known: the selected one, as a server renders it.
    expect(tabStops([], 'master')).toBe('master');
  });

  it('sends the events of its actions', () => {
    const { service, log } = tabs({ activationMode: 'manual' });
    const api = connect(service);
    api.setValue('master');
    expect(service.context.get('value')).toBe('master');

    api.focus('mix');
    api.focusNext();
    expect(service.context.get('focusedValue')).toBe('master');
    api.focusPrevious();
    api.focusLast();
    expect(service.context.get('focusedValue')).toBe('master');
    api.focusFirst();
    expect(service.context.get('focusedValue')).toBe('mix');
    expect(log.filter((entry) => entry === 'run focusTrigger')).toHaveLength(5);
  });
});
