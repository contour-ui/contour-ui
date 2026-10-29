import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Collapsible, Link } from '../index.ts';

const meta: Meta<typeof Collapsible.Root> = {
  title: 'Essentials/Collapsible',
  component: Collapsible.Root,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/** The text the stories show and hide: muted, with room above it. */
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

/** A trigger with a chevron that turns as the content grows to its height. */
export const Default: Story = {
  render: (args) => <Shipping {...args} />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Shipping' });
    await expect(trigger).toHaveClass('contour-collapsible__trigger');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByText(/Orders ship/u)).toBeVisible();

    await userEvent.click(trigger);
    await waitFor(async () => {
      await expect(canvas.queryByText(/Orders ship/u)).not.toBeVisible();
    });
  },
};

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

/** Closed, open, disabled, and a sidebar folder whose name is a link next to the trigger. */
export const States: Story = {
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
  play: async ({ canvas }) => {
    const [closed, open, disabled] = canvas.getAllByRole('button', { name: 'Shipping' });
    await expect(closed).toHaveAttribute('aria-expanded', 'false');
    await expect(open).toHaveAttribute('aria-expanded', 'true');
    await expect(disabled).toBeDisabled();

    const folder = canvas.getByRole('button', { name: 'Guide pages' });
    await userEvent.click(folder);
    await waitFor(async () => {
      await expect(canvas.queryByRole('link', { name: 'Themes' })).toBeNull();
    });
    await userEvent.click(folder);
    await expect(canvas.getByRole('link', { name: 'Themes' })).toBeVisible();
  },
};
