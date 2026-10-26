import { describe, expect, it } from 'vite-plus/test';

import { createMachine, platformNames } from './create-machine.ts';
import { playerMachine } from './fixtures.test-utils.ts';
import type { MachineConfig } from './types.ts';

interface ToggleSchema {
  input: object;
  props: object;
  context: object;
  state: 'off' | 'on';
  event: { readonly type: 'TOGGLE' };
  action: never;
  guard: 'ready';
  delay: 'auto';
  platformAction: never;
  platformEffect: never;
}

const toggle: MachineConfig<ToggleSchema> = {
  props: (input) => input,
  context: {},
  initial: 'off',
  states: {
    off: { on: { TOGGLE: { target: 'on', guard: 'ready' } } },
    on: { on: { TOGGLE: { target: 'off' } }, after: { auto: 'off' } },
  },
  actions: {},
  guards: { ready: () => true },
  delays: { auto: () => 100 },
};

/** A definition the type checker would reject, as a plain JavaScript caller could pass it. */
function untyped(config: object): MachineConfig<ToggleSchema> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return config as MachineConfig<ToggleSchema>;
}

describe('createMachine', () => {
  it('returns the definition when it is consistent', () => {
    expect(createMachine(toggle)).toBe(toggle);
  });

  it('rejects an unknown initial state, target, guard or delay', () => {
    expect(() => createMachine(untyped({ ...toggle, initial: 'nowhere' }))).toThrow(
      'createMachine: the initial state "nowhere" is not a state.',
    );
    expect(() =>
      createMachine(
        untyped({
          ...toggle,
          states: { ...toggle.states, off: { on: { TOGGLE: { target: 'up' } } } },
        }),
      ),
    ).toThrow('a transition of state "off" targets the unknown state "up".');
    expect(() =>
      createMachine(
        untyped({
          ...toggle,
          states: { ...toggle.states, off: { on: { TOGGLE: { guard: 'set' } } } },
        }),
      ),
    ).toThrow('a transition of state "off" uses the unknown guard "set".');
    expect(() =>
      createMachine(
        untyped({ ...toggle, states: { ...toggle.states, on: { after: { soon: 'off' } } } }),
      ),
    ).toThrow('state "on" uses the unknown delay "soon".');
    expect(() => createMachine(untyped({ ...toggle, on: { TOGGLE: { target: 'up' } } }))).toThrow(
      'a machine-level transition targets the unknown state "up".',
    );
  });

  it('accepts an initial state computed from the props', () => {
    expect(() => createMachine({ ...toggle, initial: () => 'on' })).not.toThrow();
  });
});

describe('platformNames', () => {
  it('lists the actions the machine does not implement and every effect', () => {
    const names = platformNames(playerMachine);
    expect([...names.actions].toSorted()).toStrictEqual(['announce', 'seek', 'warnLocked']);
    expect([...names.effects].toSorted()).toStrictEqual(['meter', 'wakeLock']);
  });
});
