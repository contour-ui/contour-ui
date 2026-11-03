import { expectNoAxeViolations } from '@contour-ui/vite-config/visual';
import { expect, test } from 'vite-plus/test';
import { render } from 'vitest-browser-react';

import { Placeholder } from '../index.ts';

test('Placeholder.Root renders an unstyled root part', async () => {
  const screen = await render(<Placeholder.Root>content</Placeholder.Root>);

  await expect.element(screen.getByText('content')).toHaveAttribute('data-part', 'root');
});

test('has no axe violations: Default', async () => {
  const screen = await render(<Placeholder.Root>Unstyled placeholder</Placeholder.Root>);

  await expect.element(screen.getByText('Unstyled placeholder')).toBeInTheDocument();
  await expectNoAxeViolations();
});
