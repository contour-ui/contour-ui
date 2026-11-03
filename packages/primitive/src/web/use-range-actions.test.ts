import { expect, it, vi } from 'vite-plus/test';

import { useRangeActions } from './use-range-actions.ts';

it('declares no actions on the web, where screen readers send the keys', () => {
  const onStep = vi.fn<(direction: 1 | -1) => void>();
  const onSetValue = vi.fn<(value: number) => void>();
  const result = useRangeActions({ disabled: false, onStep, onSetValue });

  expect(result.props).toStrictEqual({});
  expect(result.ref).toBeUndefined();
  expect(useRangeActions({ disabled: true, onStep, onSetValue })).toBe(result);
  expect(Object.isFrozen(result.props)).toBe(true);
  expect(onStep).not.toHaveBeenCalled();
  expect(onSetValue).not.toHaveBeenCalled();
});
