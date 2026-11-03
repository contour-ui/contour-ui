import { expect, it } from 'vite-plus/test';

import { PLATFORM } from './index.ts';

it('is the web build', () => {
  expect(PLATFORM).toBe('web');
});
