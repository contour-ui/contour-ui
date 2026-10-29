import type { CSSProperties } from 'react';

/**
 * Inline styles that hide an element from sight but keep it in the accessibility tree, for text
 * that only assistive technology needs, such as a live region. Headless ships no CSS, so they
 * go in `style`.
 */
export const visuallyHidden: Readonly<CSSProperties> = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  border: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};
