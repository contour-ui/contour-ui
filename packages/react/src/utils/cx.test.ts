import { describe, expect, it } from 'vite-plus/test';

import { cx } from './cx.ts';

describe('cx', () => {
  it('joins class names with spaces, in order', () => {
    expect(cx('contour-card', 'contour-card__title', 'custom')).toBe(
      'contour-card contour-card__title custom',
    );
  });

  it('skips falsy values', () => {
    expect(cx('contour-button', undefined, null, false, '', 'custom')).toBe(
      'contour-button custom',
    );
  });

  it('returns an empty string when nothing is left', () => {
    expect(cx()).toBe('');
    expect(cx(undefined, false)).toBe('');
  });
});
