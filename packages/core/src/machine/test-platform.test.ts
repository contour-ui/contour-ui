import { describe, expect, it, vi } from 'vite-plus/test';

import { playerMachine } from './fixtures.test-utils.ts';
import { createService } from './service.ts';
import { createTestPlatform } from './test-platform.ts';

describe('createTestPlatform', () => {
  it('fires due timers in time order, including those scheduled while advancing', () => {
    const { platform, advance, now, pending } = createTestPlatform(playerMachine);
    const fired: string[] = [];
    platform.schedule(
      300,
      () => {
        fired.push('300');
      },
      'slow',
    );
    platform.schedule(
      100,
      () => {
        fired.push('100');
        platform.schedule(
          50,
          () => {
            fired.push('100 + 50');
          },
          'chained',
        );
      },
      'fast',
    );
    platform.schedule(
      100,
      () => {
        fired.push('100, scheduled second');
      },
      'fast too',
    );

    advance(200);
    expect(fired).toStrictEqual(['100', '100, scheduled second', '100 + 50']);
    expect(now()).toBe(200);
    expect(pending()).toBe(1);

    advance(100);
    expect(fired.at(-1)).toBe('300');
  });

  it('cancels a timer', () => {
    const { platform, advance, pending, log } = createTestPlatform(playerMachine);
    const fire = vi.fn<() => void>();
    const cancel = platform.schedule(10, fire, 'blink');
    cancel();
    cancel();

    advance(100);
    expect(fire).not.toHaveBeenCalled();
    expect(pending()).toBe(0);
    expect(log).toStrictEqual(['schedule blink 10', 'cancel blink']);
  });

  it('records the platform actions and effects of a machine and runs the overrides', () => {
    const seek = vi.fn<() => void>();
    const cleanup = vi.fn<() => void>();
    const test = createTestPlatform(playerMachine, {
      actions: { seek },
      effects: { meter: () => cleanup },
    });
    const service = createService(playerMachine, { props: {}, platform: test.platform });
    service.start();

    service.send({ type: 'SEEK' });
    service.send({ type: 'PLAY' });
    service.send({ type: 'STOP' });

    expect(seek).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(test.log).toStrictEqual([
      'run seek',
      'run announce',
      'start meter',
      'start wakeLock',
      'stop wakeLock',
      'stop meter',
    ]);
  });
});
