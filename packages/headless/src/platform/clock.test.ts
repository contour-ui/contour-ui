import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { schedule } from './clock.ts';

describe('schedule', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // The spy wraps the fake `setTimeout`: remove it before the real timers come back.
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('fires after the delay', () => {
    const fire = vi.fn<() => void>();
    schedule(100, fire);

    vi.advanceTimersByTime(99);
    expect(fire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('never fires once cancelled', () => {
    const fire = vi.fn<() => void>();
    const cancel = schedule(100, fire);

    cancel();
    vi.advanceTimersByTime(1000);
    expect(fire).not.toHaveBeenCalled();
  });

  it('waits the longest delay setTimeout takes for a longer one, instead of firing at once', () => {
    const setTimeout = vi.spyOn(globalThis, 'setTimeout');
    const fire = vi.fn<() => void>();
    schedule(Number.POSITIVE_INFINITY, fire);

    expect(setTimeout).toHaveBeenCalledWith(fire, 2_147_483_647);
    vi.advanceTimersByTime(1000);
    expect(fire).not.toHaveBeenCalled();
  });
});
