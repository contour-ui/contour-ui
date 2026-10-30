import { vars } from '@contour-ui/tokens';
import { page, userEvent } from 'vite-plus/test/browser';

import { CloseButton } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

visualStates({
  default: {
    render: () => <CloseButton />,
    // The button with the focus and its ring, focused from the keyboard rather than clicked: the
    // pointer hovers nothing.
    ready: () => userEvent.tab(),
    focused: () => page.getByRole('button', { name: 'Close' }),
  },
  // Every size, and a label that says what closes.
  sizes: {
    render: () => (
      <div style={{ display: 'flex', alignItems: 'center', gap: vars.space['group-gap'] }}>
        <CloseButton size="sm" />
        <CloseButton size="md" />
        <CloseButton size="lg" />
        <CloseButton label="Close search" />
      </div>
    ),
  },
});
