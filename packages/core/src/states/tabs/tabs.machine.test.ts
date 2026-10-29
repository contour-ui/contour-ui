import { describe, expect, it, vi } from 'vite-plus/test';

import { createService, createTestPlatform } from '../../machine/index.ts';
import type { Service } from '../../machine/index.ts';
import { tabsMachine } from './tabs.machine.ts';
import type {
  TabsEvent,
  TabsFocusChangeDetails,
  TabsInput,
  TabsSchema,
  TabsTrigger,
  TabsValueChangeDetails,
} from './tabs.types.ts';

/** Mix, Sends (disabled), Master, Meter. */
const TRIGGERS: readonly TabsTrigger[] = [
  { value: 'mix' },
  { value: 'sends', disabled: true },
  { value: 'master' },
  { value: 'meter' },
];

/** Started tabs over `TRIGGERS` on the test platform, which records the focused triggers. */
function tabs(props: Partial<TabsInput> = {}) {
  const focused: Array<string | null> = [];
  const test = createTestPlatform(tabsMachine, {
    actions: {
      focusTrigger: ({ context }) => {
        focused.push(context.get('focusedValue'));
      },
    },
  });
  const service = createService(tabsMachine, {
    props: { triggers: TRIGGERS, ...props },
    platform: test.platform,
  });
  service.start();
  return { service, test, focused };
}

const valueOf = (service: Service<TabsSchema>): string | null => service.context.get('value');
const focusOf = (service: Service<TabsSchema>): string | null =>
  service.context.get('focusedValue');

/** Send each event, and return the focused trigger after each one. */
function focuses(service: Service<TabsSchema>, events: readonly TabsEvent[]) {
  return events.map((event) => {
    service.send(event);
    return focusOf(service);
  });
}

const NEXT = { type: 'FOCUS.NEXT' } as const;
const PREVIOUS = { type: 'FOCUS.PREVIOUS' } as const;
const FIRST = { type: 'FOCUS.FIRST' } as const;
const LAST = { type: 'FOCUS.LAST' } as const;
const focusEvent = (value: string): TabsEvent => ({ type: 'TRIGGER.FOCUS', value });
const click = (value: string): TabsEvent => ({ type: 'TRIGGER.CLICK', value });

describe('tabs machine', () => {
  it('starts with the default value, or with no tab selected', () => {
    expect(valueOf(tabs({ defaultValue: 'master' }).service)).toBe('master');
    expect(valueOf(tabs().service)).toBeNull();
    expect(focusOf(tabs().service)).toBeNull();
  });

  it('fills in the defaults of the props', () => {
    const { service } = tabs();
    expect([
      service.prop('orientation'),
      service.prop('activationMode'),
      service.prop('loopFocus'),
    ]).toStrictEqual(['horizontal', 'automatic', true]);
    const empty = createService(tabsMachine, {
      props: {},
      platform: createTestPlatform(tabsMachine).platform,
    });
    expect(empty.prop('triggers')).toStrictEqual([]);
  });

  describe('keyboard focus', () => {
    it('steps over disabled triggers and wraps around by default', () => {
      const { service, focused } = tabs({ defaultValue: 'mix' });
      service.send(focusEvent('mix'));

      expect(focuses(service, [NEXT, NEXT, NEXT, PREVIOUS, PREVIOUS])).toStrictEqual([
        'master',
        'meter',
        'mix',
        'meter',
        'master',
      ]);
      expect(focuses(service, [FIRST, LAST])).toStrictEqual(['mix', 'meter']);
      // The platform focused each trigger the machine moved to.
      expect(focused).toStrictEqual(['master', 'meter', 'mix', 'meter', 'master', 'mix', 'meter']);
    });

    it('stops at the ends without loopFocus', () => {
      const { service } = tabs({ loopFocus: false, defaultValue: 'meter' });
      service.send(focusEvent('meter'));
      expect(focuses(service, [NEXT, FIRST, PREVIOUS])).toStrictEqual(['meter', 'mix', 'mix']);
    });

    it('starts from the selected tab while no trigger has focus, or else from an end', () => {
      expect(focuses(tabs({ defaultValue: 'master' }).service, [NEXT])).toStrictEqual(['meter']);
      expect(focuses(tabs().service, [NEXT])).toStrictEqual(['mix']);
      expect(focuses(tabs().service, [PREVIOUS])).toStrictEqual(['meter']);
      // A value without a trigger is no place to start from.
      expect(focuses(tabs({ defaultValue: 'gone' }).service, [NEXT])).toStrictEqual(['mix']);
    });

    it('selects as focus moves in the automatic mode', () => {
      const onValueChange = vi.fn<(details: TabsValueChangeDetails) => void>();
      const { service } = tabs({ defaultValue: 'mix', onValueChange });
      service.send(focusEvent('mix'));
      service.send(NEXT);
      service.send(LAST);

      expect(valueOf(service)).toBe('meter');
      expect(onValueChange.mock.calls).toStrictEqual([[{ value: 'master' }], [{ value: 'meter' }]]);
    });

    it('only moves focus in the manual mode', () => {
      const onValueChange = vi.fn<(details: TabsValueChangeDetails) => void>();
      const { service } = tabs({ defaultValue: 'mix', activationMode: 'manual', onValueChange });
      service.send(focusEvent('mix'));
      service.send(NEXT);
      expect([valueOf(service), focusOf(service)]).toStrictEqual(['mix', 'master']);

      // Enter or Space on the trigger is a click.
      service.send(click('master'));
      expect(valueOf(service)).toBe('master');
      expect(onValueChange.mock.calls).toStrictEqual([[{ value: 'master' }]]);
    });

    it('does nothing without enabled triggers', () => {
      const { service, focused } = tabs({ triggers: [{ value: 'a', disabled: true }] });
      service.send(NEXT);
      service.send(FIRST);
      expect([focusOf(service), valueOf(service)]).toStrictEqual([null, null]);
      expect(focused).toStrictEqual([null, null]);
    });
  });

  describe('focus of a trigger', () => {
    it('records the focused trigger and reports it', () => {
      const onFocusChange = vi.fn<(details: TabsFocusChangeDetails) => void>();
      const { service } = tabs({ activationMode: 'manual', onFocusChange });
      service.send(focusEvent('master'));
      service.send({ type: 'BLUR' });

      expect(focusOf(service)).toBeNull();
      expect(onFocusChange.mock.calls).toStrictEqual([
        [{ focusedValue: 'master' }],
        [{ focusedValue: null }],
      ]);
      expect(valueOf(service)).toBeNull();
    });

    it('does not select the focused tab, also in the automatic mode', () => {
      const { service } = tabs();
      service.send(focusEvent('meter'));
      expect([focusOf(service), valueOf(service)]).toStrictEqual(['meter', null]);
    });

    it('moves focus to an enabled trigger with FOCUS.SET', () => {
      const { service, focused } = tabs();
      service.send({ type: 'FOCUS.SET', value: 'sends' });
      service.send({ type: 'FOCUS.SET', value: 'meter' });
      expect(focused).toStrictEqual(['meter']);
      expect([focusOf(service), valueOf(service)]).toStrictEqual(['meter', null]);
    });
  });

  describe('selection', () => {
    it('selects the tab of a clicked trigger, unless it is disabled', () => {
      const { service } = tabs({ defaultValue: 'mix' });
      service.send(click('sends'));
      expect(valueOf(service)).toBe('mix');
      service.send(click('meter'));
      expect(valueOf(service)).toBe('meter');
    });

    it('counts a trigger it was not told about as enabled', () => {
      const { service } = tabs({ triggers: [] });
      service.send(click('mix'));
      expect(valueOf(service)).toBe('mix');
    });

    it('selects any value with VALUE.SET', () => {
      const onValueChange = vi.fn<(details: TabsValueChangeDetails) => void>();
      const { service } = tabs({ onValueChange });
      service.send({ type: 'VALUE.SET', value: 'sends' });
      service.send({ type: 'VALUE.SET', value: 'sends' });
      service.send({ type: 'VALUE.SET', value: 'elsewhere' });
      expect(onValueChange.mock.calls).toStrictEqual([
        [{ value: 'sends' }],
        [{ value: 'elsewhere' }],
      ]);
    });

    it('only reports a selection while the value is controlled', () => {
      const onValueChange = vi.fn<(details: TabsValueChangeDetails) => void>();
      const { service } = tabs({ value: 'mix', onValueChange });
      service.send(click('meter'));
      expect(valueOf(service)).toBe('mix');
      expect(onValueChange.mock.calls).toStrictEqual([[{ value: 'meter' }]]);

      service.setProps({ triggers: TRIGGERS, value: 'meter', onValueChange });
      expect(valueOf(service)).toBe('meter');
      // `null` keeps the value controlled, with no tab selected.
      service.setProps({ triggers: TRIGGERS, value: null, onValueChange });
      service.send(click('mix'));
      expect(valueOf(service)).toBeNull();
    });

    it('takes the first of two triggers with one value', () => {
      const { service } = tabs({
        triggers: [{ value: 'a' }, { value: 'b' }, { value: 'a', disabled: true }],
      });
      expect(focuses(service, [FIRST, NEXT, NEXT])).toStrictEqual(['a', 'b', 'a']);
      expect(valueOf(service)).toBe('a');
    });
  });
});
