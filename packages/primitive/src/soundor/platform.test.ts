import { expect, it } from 'vite-plus/test';

import { PLATFORM } from './index.ts';

it('is the Soundor build', () => {
  expect(PLATFORM).toBe('soundor');
});
