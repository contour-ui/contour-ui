import { describe, expect, it, vi } from 'vite-plus/test';

import { playerMachine } from './fixtures.test-utils.ts';
import type { PlayerInput, PlayerSchema } from './fixtures.test-utils.ts';
import { createService } from './service.ts';
import { createTestPlatform } from './test-platform.ts';
import type { TestPlatformOverrides } from './test-platform.ts';
import type { Platform } from './types.ts';

/** A platform the type checker would reject, as a plain JavaScript caller could pass it. */
function incomplete(platform: object): Platform<PlayerSchema> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return platform as Platform<PlayerSchema>;
}

/** A player on the test platform, not started yet. */
function player(props: PlayerInput = {}, overrides?: TestPlatformOverrides<PlayerSchema>) {
  const test = createTestPlatform(playerMachine, overrides);
  const service = createService(playerMachine, { props, platform: test.platform });
  return { service, test };
}

describe('createService', () => {
  it('does nothing until start, and ignores events sent before it', () => {
    const { service, test } = player();
    service.send({ type: 'PLAY' });

    expect(service.getSnapshot().state).toBe('stopped');
    expect(test.log).toStrictEqual([]);

    service.start();
    service.send({ type: 'PLAY' });
    expect(service.matches('playing')).toBe(true);
  });

  it('runs entry actions, starts effects and schedules delays as it moves', () => {
    const { service, test } = player();
    service.start();

    service.send({ type: 'PLAY' });
    expect(test.log).toStrictEqual(['run announce', 'start meter', 'start wakeLock']);
    expect(service.context.get('plays')).toBe(1);

    service.send({ type: 'PAUSE' });
    expect(test.log.slice(3)).toStrictEqual(['stop wakeLock', 'stop meter', 'schedule 1000']);
  });

  it('takes the delayed transition when the time runs out, not before', () => {
    const { service, test } = player({ idleTimeout: 2000 });
    service.start();
    service.send({ type: 'PLAY' });
    service.send({ type: 'PAUSE' });

    test.advance(1999);
    expect(service.matches('paused')).toBe(true);
    test.advance(1);
    expect(service.matches('stopped')).toBe(true);
    expect(test.pending()).toBe(0);
  });

  it('cancels the delay of a state it leaves before the time runs out', () => {
    const { service, test } = player();
    service.start();
    service.send({ type: 'PLAY' });
    service.send({ type: 'PAUSE' });
    service.send({ type: 'PLAY' });

    expect(test.pending()).toBe(0);
    test.advance(5000);
    expect(service.matches('playing')).toBe(true);
  });

  it('restarts the effects and entry actions of a state it re-enters', () => {
    const { service, test } = player();
    service.start();
    service.send({ type: 'PLAY' });
    service.send({ type: 'RESTART' });

    expect(test.log.slice(3)).toStrictEqual([
      'stop wakeLock',
      'stop meter',
      'run announce',
      'start meter',
      'start wakeLock',
    ]);
  });

  it('calls subscribers once per event, and only when the snapshot changed', () => {
    const { service } = player({ locked: true });
    const listener = vi.fn<() => void>();
    service.subscribe(listener);
    service.start();

    // Locked: the guard sends PLAY to the fallback transition, which changes nothing.
    service.send({ type: 'PLAY' });
    expect(listener).not.toHaveBeenCalled();

    service.setProps({ locked: false });
    // State and context change in one event: one call.
    service.send({ type: 'PLAY' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps the snapshot object until something changes', () => {
    const { service } = player();
    service.start();
    const before = service.getSnapshot();

    service.send({ type: 'PAUSE' });
    expect(service.getSnapshot()).toBe(before);
    service.send({ type: 'PLAY' });
    expect(service.getSnapshot()).not.toBe(before);
    expect(service.getSnapshot()).toStrictEqual({
      state: 'playing',
      context: { volume: 50, plays: 1 },
    });
  });

  it('handles an event sent from an action after the current one', () => {
    const { service, test } = player(
      {},
      {
        actions: {
          announce: ({ send }) => {
            send({ type: 'PAUSE' });
          },
        },
      },
    );
    service.start();
    service.send({ type: 'PLAY' });

    // PLAY finished entering `playing` (both effects started) before PAUSE left it.
    expect(test.log).toStrictEqual([
      'run announce',
      'start meter',
      'start wakeLock',
      'stop wakeLock',
      'stop meter',
      'schedule 1000',
    ]);
    expect(service.matches('paused')).toBe(true);
  });

  it('handles a delay that a clock fires from inside schedule after the current event', () => {
    const platform: Platform<PlayerSchema> = {
      schedule: (_ms, fire) => {
        fire();
        return () => {};
      },
      actions: { announce: () => {}, seek: () => {}, warnLocked: () => {} },
      effects: { meter: () => undefined, wakeLock: () => undefined },
    };
    const service = createService(playerMachine, { props: {}, platform });
    service.start();
    service.send({ type: 'PLAY' });
    service.send({ type: 'PAUSE' });

    expect(service.matches('stopped')).toBe(true);
  });

  it('runs the cleanup an effect returns when the state ends', () => {
    const cleanup = vi.fn<() => void>();
    const { service } = player({}, { effects: { meter: () => cleanup } });
    service.start();
    service.send({ type: 'PLAY' });
    expect(cleanup).not.toHaveBeenCalled();

    service.send({ type: 'STOP' });
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  describe('stop and start', () => {
    it('stop cancels delays and stops effects; later events are ignored', () => {
      const { service, test } = player();
      service.start();
      service.send({ type: 'PLAY' });
      service.stop();

      expect(test.log.slice(3)).toStrictEqual(['stop wakeLock', 'stop meter']);
      service.send({ type: 'PAUSE' });
      expect(service.matches('playing')).toBe(true);

      const paused = player();
      paused.service.start();
      paused.service.send({ type: 'PLAY' });
      paused.service.send({ type: 'PAUSE' });
      paused.service.stop();
      expect(paused.test.pending()).toBe(0);
    });

    it('start after stop resumes the current state without its entry actions', () => {
      const { service, test } = player();
      service.start();
      service.send({ type: 'PLAY' });
      service.stop();
      service.start();

      expect(test.log.slice(5)).toStrictEqual(['start meter', 'start wakeLock']);
      service.send({ type: 'PAUSE' });
      expect(service.matches('paused')).toBe(true);
    });

    it('stop from inside an action ends the event there', () => {
      // The action needs the service, which needs the platform with the action.
      const late: { stop?: () => void } = {};
      const { service, test } = player(
        {},
        {
          actions: {
            announce: () => {
              late.stop?.();
            },
          },
        },
      );
      late.stop = service.stop;
      service.start();
      service.send({ type: 'PLAY' });

      expect(test.log).toStrictEqual(['run announce']);
    });
  });

  describe('context', () => {
    it('an owned field takes new values and reports them', () => {
      const onVolumeChange = vi.fn<(volume: number) => void>();
      const listener = vi.fn<() => void>();
      const { service } = player({ defaultVolume: 20, onVolumeChange });
      service.subscribe(listener);
      service.start();

      service.send({ type: 'VOLUME', volume: 30 });
      expect(service.context.get('volume')).toBe(30);
      expect(onVolumeChange).toHaveBeenCalledWith(30);
      expect(listener).toHaveBeenCalledTimes(1);

      // The same value again: dropped.
      service.send({ type: 'VOLUME', volume: 30 });
      expect(onVolumeChange).toHaveBeenCalledTimes(1);
    });

    it('a controlled field follows its prop and only reports new values', () => {
      const onVolumeChange = vi.fn<(volume: number) => void>();
      const listener = vi.fn<() => void>();
      const { service } = player({ volume: 70, onVolumeChange });
      service.subscribe(listener);
      service.start();

      service.send({ type: 'VOLUME', volume: 80 });
      expect(onVolumeChange).toHaveBeenCalledWith(80);
      expect(service.context.get('volume')).toBe(70);
      expect(listener).not.toHaveBeenCalled();

      service.setProps({ volume: 80, onVolumeChange });
      expect(service.context.get('volume')).toBe(80);
    });

    it('set outside an event notifies the subscribers too', () => {
      const listener = vi.fn<() => void>();
      const { service } = player();
      service.subscribe(listener);
      service.start();

      service.context.set('volume', 10);
      expect(service.context.get('volume')).toBe(10);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('props', () => {
    it('setProps fills in the defaults and is read at once', () => {
      const { service } = player({ idleTimeout: 5 });
      expect(service.prop('idleTimeout')).toBe(5);
      service.setProps({});
      expect(service.prop('idleTimeout')).toBe(1000);
    });

    it('syncProps runs the watch actions of the props that changed since the last sync', () => {
      const { service } = player();
      service.start();
      service.send({ type: 'PLAY' });

      service.setProps({ idleTimeout: 10 });
      service.syncProps();
      expect(service.matches('playing')).toBe(true);

      service.setProps({ locked: true });
      service.syncProps();
      expect(service.matches('stopped')).toBe(true);
    });
  });

  it('rejects a platform without an action or an effect the machine uses', () => {
    const test = createTestPlatform(playerMachine);
    const { announce: _announce, ...actions } = test.platform.actions;
    const { meter: _meter, ...effects } = test.platform.effects;

    expect(() =>
      createService(playerMachine, {
        props: {},
        platform: incomplete({ ...test.platform, actions }),
      }),
    ).toThrow('createService: the platform has no action "announce".');
    expect(() =>
      createService(playerMachine, {
        props: {},
        platform: incomplete({ ...test.platform, effects }),
      }),
    ).toThrow('createService: the platform has no effect "meter".');
  });
});
