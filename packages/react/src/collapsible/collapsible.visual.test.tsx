import { vars } from '@contour-ui/tokens';
import { useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';

import { Collapsible, Link } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

/** The text the states show and hide: muted, with room above it. */
const body: CSSProperties = {
  margin: 0,
  paddingBlockStart: vars.space['control-gap'],
  color: vars.color.fg.muted,
  font: vars.text.body.font,
  maxInlineSize: '24rem',
};

/** A collapsible with a chevron and a paragraph. */
function Shipping(props: Collapsible.RootProps): ReactElement {
  return (
    <Collapsible.Root {...props}>
      <Collapsible.Trigger>
        <Collapsible.Indicator />
        Shipping
      </Collapsible.Trigger>
      <Collapsible.Content>
        <p style={body}>
          Orders ship within two business days. Tracking arrives by email once the parcel leaves the
          warehouse.
        </p>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

/** A folder of a sidebar: its name links to its index page, and the chevron next to it toggles. */
function Folder(): ReactElement {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible.Root
      open={open}
      onOpenChange={(details) => {
        setOpen(details.open);
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: vars.space['control-gap'] }}>
        <Collapsible.Trigger aria-label="Guide pages">
          <Collapsible.Indicator />
        </Collapsible.Trigger>
        <Link href="#guide">Guide</Link>
      </div>
      <Collapsible.Content>
        <ul style={{ ...body, paddingInlineStart: vars.space['section-gap'] }}>
          <li>
            <Link href="#installation">Installation</Link>
          </li>
          <li>
            <Link href="#themes">Themes</Link>
          </li>
        </ul>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

visualStates({
  // The trigger after the story's play opened and closed the content: closed, with the focus ring
  // its clicks left, here from the keyboard.
  default: {
    render: () => <Shipping />,
    ready: async () => {
      await userEvent.tab();
      await userEvent.keyboard('{Enter}');
      await userEvent.keyboard('{Enter}');
    },
    focused: () => page.getByRole('button', { name: 'Shipping' }),
  },
  // Closed, open, disabled, and a sidebar folder whose name is a link next to the trigger, which
  // the story's play closed and opened again, from the keyboard here.
  states: {
    render: () => (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, max-content)',
          alignItems: 'start',
          gap: vars.space['section-gap'],
          color: vars.color.fg.default,
          font: vars.text.body.font,
        }}
      >
        <span style={{ color: vars.color.fg.muted }}>Closed</span>
        <Shipping />
        <span style={{ color: vars.color.fg.muted }}>Open</span>
        <Shipping defaultOpen />
        <span style={{ color: vars.color.fg.muted }}>Disabled</span>
        <Shipping disabled />
        <span style={{ color: vars.color.fg.muted }}>Link and trigger</span>
        <Folder />
      </div>
    ),
    ready: async () => {
      // The closed and the open trigger come first; the disabled one takes no focus.
      await userEvent.tab();
      await userEvent.tab();
      await userEvent.tab();
      await userEvent.keyboard('{Enter}');
      // Closed once its pages are gone, as the play waited before it opened the folder again.
      await vi.waitFor(() => {
        if (page.getByRole('link', { name: 'Themes' }).query() !== null) {
          throw new Error('The folder is still open.');
        }
      });
      await userEvent.keyboard('{Enter}');
    },
    focused: () => page.getByRole('button', { name: 'Guide pages' }),
  },
});
