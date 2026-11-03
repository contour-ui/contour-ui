import { expect, it } from 'vite-plus/test';

import { RESTING_INTERACTION } from '../shared/interaction.ts';
import { resolveStyle } from './part-style.ts';

it('passes a style as it is, whatever the state', () => {
  const style = { color: 'red' };

  expect(resolveStyle(style, RESTING_INTERACTION)).toBe(style);
  expect(resolveStyle(style, { ...RESTING_INTERACTION, hovered: true })).toBe(style);
  expect(resolveStyle(undefined, RESTING_INTERACTION)).toBeUndefined();
});
