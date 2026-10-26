import { describe, expect, it } from 'vite-plus/test';

import { resolvePositioningOptions } from './resolve-options.ts';

describe('resolvePositioningOptions', () => {
  it('fills in the defaults', () => {
    expect(resolvePositioningOptions()).toStrictEqual({
      placement: 'bottom',
      offset: 0,
      flip: true,
      shift: 0,
      sameWidth: false,
      fitViewport: false,
      strategy: 'absolute',
    });
  });

  it('lets a later set win, and keeps the earlier value of an option it leaves out', () => {
    const popover = { placement: 'bottom-start', offset: 8, shift: 8, fitViewport: true } as const;

    expect(
      resolvePositioningOptions(popover, { placement: 'top', offset: undefined }, undefined),
    ).toStrictEqual({
      placement: 'top',
      offset: 8,
      flip: true,
      shift: 8,
      sameWidth: false,
      fitViewport: true,
      strategy: 'absolute',
    });
  });

  it('takes `false` and 0 as values, not as options left out', () => {
    expect(
      resolvePositioningOptions(
        { offset: 8, flip: ['top'], shift: 8, fitViewport: true },
        { offset: 0, flip: false, shift: false, fitViewport: false },
      ),
    ).toMatchObject({ offset: 0, flip: false, shift: false, fitViewport: false });
  });
});
