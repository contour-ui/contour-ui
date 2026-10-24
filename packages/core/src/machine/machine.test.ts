import { describe, expect, it } from 'vite-plus/test';

import { createMachine } from './index.ts';

describe('createMachine', () => {
  it('creates a machine with the given id', () => {
    expect(createMachine('toggle')).toStrictEqual({ id: 'toggle' });
  });
});
