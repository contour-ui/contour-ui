import { describe, expect, it } from 'vite-plus/test';

import { playerMachine } from './fixtures.test-utils.ts';
import type { PlayerEvent, PlayerProps, PlayerSchema } from './fixtures.test-utils.ts';
import { enterState, leaveState, transition } from './transition.ts';
import type { InternalEvent, MachineReadParams } from './types.ts';

/** Reads for a guard or a delay: the given props, a context with its defaults. */
function reads(
  event: PlayerEvent | InternalEvent,
  props: Partial<PlayerProps> = {},
): MachineReadParams<PlayerSchema> {
  const resolved: PlayerProps = { idleTimeout: 1000, ...props };
  const context = { volume: 50, plays: 0 };
  return {
    prop: (key) => resolved[key],
    context: { get: (key) => context[key] },
    event,
  };
}

const step = (
  state: PlayerSchema['state'],
  event: PlayerEvent | InternalEvent,
  props?: Partial<PlayerProps>,
): ReturnType<typeof transition<PlayerSchema>> =>
  transition(playerMachine, state, event, reads(event, props));

describe('transition', () => {
  it('leaves, runs the transition actions and enters, in that order', () => {
    expect(step('stopped', { type: 'PLAY' })).toStrictEqual({
      taken: true,
      state: 'playing',
      commands: [
        { type: 'run', action: 'countPlay' },
        { type: 'run', action: 'announce' },
        { type: 'start', effect: 'meter' },
        { type: 'start', effect: 'wakeLock' },
      ],
    });
    expect(step('playing', { type: 'PAUSE' }).commands).toStrictEqual([
      { type: 'stop', effect: 'wakeLock' },
      { type: 'stop', effect: 'meter' },
      { type: 'schedule', delay: 'idle', ms: 1000 },
    ]);
  });

  it('takes the first transition whose guard passes', () => {
    expect(step('stopped', { type: 'PLAY' }, { locked: true })).toStrictEqual({
      taken: true,
      state: 'stopped',
      commands: [{ type: 'run', action: 'warnLocked' }],
    });
  });

  it('runs only the actions of a transition without a target or to the current state', () => {
    expect(step('paused', { type: 'VOLUME', volume: 10 })).toStrictEqual({
      taken: true,
      state: 'paused',
      commands: [{ type: 'run', action: 'setVolume' }],
    });
    expect(step('playing', { type: 'SEEK' })).toStrictEqual({
      taken: true,
      state: 'playing',
      commands: [],
    });
  });

  it('leaves and enters the current state again with reenter', () => {
    expect(step('playing', { type: 'RESTART' }).commands).toStrictEqual([
      { type: 'stop', effect: 'wakeLock' },
      { type: 'stop', effect: 'meter' },
      { type: 'run', action: 'announce' },
      { type: 'start', effect: 'meter' },
      { type: 'start', effect: 'wakeLock' },
    ]);
  });

  it('falls back to the machine-level transitions when the state has none for the event', () => {
    expect(step('stopped', { type: 'SEEK' }).commands).toStrictEqual([
      { type: 'run', action: 'seek' },
    ]);
  });

  it('takes the after transition of a delay that ran out', () => {
    expect(step('paused', { type: 'machine.after', delay: 'idle' })).toStrictEqual({
      taken: true,
      state: 'stopped',
      commands: [{ type: 'cancel', delay: 'idle' }],
    });
    // A delay the state does not have means nothing.
    expect(step('playing', { type: 'machine.after', delay: 'idle' }).taken).toBe(false);
  });

  it('reads the duration of a delay from the props', () => {
    expect(step('playing', { type: 'PAUSE' }, { idleTimeout: 250 }).commands.at(-1)).toStrictEqual({
      type: 'schedule',
      delay: 'idle',
      ms: 250,
    });
  });

  it('ignores an event the state and the machine do not handle', () => {
    expect(step('stopped', { type: 'PAUSE' })).toStrictEqual({
      taken: false,
      state: 'stopped',
      commands: [],
    });
  });
});

describe('enterState and leaveState', () => {
  it('skip the entry and exit actions when asked', () => {
    const event: InternalEvent = { type: 'machine.start' };
    expect(enterState(playerMachine, 'playing', reads(event), { entry: false })).toStrictEqual([
      { type: 'start', effect: 'meter' },
      { type: 'start', effect: 'wakeLock' },
    ]);
    expect(leaveState(playerMachine, 'paused', { exit: false })).toStrictEqual([
      { type: 'cancel', delay: 'idle' },
    ]);
  });
});
