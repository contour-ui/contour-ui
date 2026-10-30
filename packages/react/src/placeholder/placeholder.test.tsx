import { vars } from '@contour-ui/tokens';
import { expect, test } from 'vite-plus/test';
import { render } from 'vitest-browser-react';

import { Placeholder } from '../index.ts';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';

/** Computed value of `property` when set to `value` (resolves `var(--ct-…)`). */
function computed(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const result = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return result;
}

test('Placeholder.Root is styled with semantic tokens', async () => {
  const screen = await render(<Placeholder.Root>styled</Placeholder.Root>);
  const root = screen.getByText('styled');
  const accentForeground = computed('color', vars.color.accent.fg);

  // The token resolves to a real color (tokens.css is loaded), and the stylesheet uses it.
  expect(accentForeground).toMatch(/^oklch\(/u);
  await expect.element(root).toHaveClass('contour-placeholder');
  await expect.element(root).toHaveStyle({ color: accentForeground });
});
