import { vars } from '@contour-ui/tokens';
import { expect, test } from 'vite-plus/test';
import { render } from 'vitest-browser-react';

import { AudioPlaceholder } from '../index.ts';

import '@contour-ui/tokens/tokens.css';
import '@contour-ui/kit/styles.css';
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

test('AudioPlaceholder.Root composes the kit placeholder with the value text style', async () => {
  const screen = await render(<AudioPlaceholder.Root>-12 dB</AudioPlaceholder.Root>);
  const root = screen.getByText('-12 dB');
  const valueFont = computed('font-family', vars.text.value.fontFamily);

  expect(valueFont).toContain('JetBrains Mono');
  await expect.element(root).toHaveClass('contour-placeholder');
  await expect.element(root).toHaveClass('contour-audio-placeholder');
  await expect.element(root).toHaveStyle({ fontFamily: valueFont });
});
