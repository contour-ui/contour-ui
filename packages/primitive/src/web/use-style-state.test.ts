import { expect, it } from 'vite-plus/test';

import { RESTING_INTERACTION } from '../shared/interaction.ts';
import { useStyleState } from './use-style-state.ts';

it('rests and hands over no props, the same frozen object on every call', () => {
  const result = useStyleState({ disabled: false });

  expect(result.state).toBe(RESTING_INTERACTION);
  expect(result.props).toStrictEqual({});
  expect(useStyleState()).toBe(result);
  expect(useStyleState({ disabled: true })).toBe(result);
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.props)).toBe(true);
});
