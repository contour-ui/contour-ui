import { describe, expect, it } from 'vite-plus/test';

import { placeholderIcon } from './index.ts';

describe('placeholderIcon', () => {
  it('has a square viewBox', () => {
    expect(placeholderIcon.viewBox).toBe('0 0 16 16');
  });
});
