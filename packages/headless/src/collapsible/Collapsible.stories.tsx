import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Collapsible } from '../index.ts';

/**
 * The stories' own styles, since Headless has none: content that grows to its height
 * (`--height`) as it opens and shrinks back as it closes, and a chevron that turns.
 */
const STYLES = `
@keyframes collapsible-story-expand { from { height: 0; } to { height: var(--height); } }
@keyframes collapsible-story-collapse { from { height: var(--height); } to { height: 0; } }
.collapsible-story { max-inline-size: 24rem; }
.collapsible-story-trigger { display: inline-flex; gap: 6px; align-items: center; }
.collapsible-story-indicator { display: inline-block; transition: rotate 150ms; }
.collapsible-story-indicator[data-state='open'] { rotate: 90deg; }
.collapsible-story-content { overflow: hidden; }
.collapsible-story-content[data-state='open'] { animation: collapsible-story-expand 200ms ease-out; }
.collapsible-story-content[data-state='closed'] { animation: collapsible-story-collapse 150ms ease-in; }
.collapsible-story-body { margin: 0; padding-block: 8px; }
.collapsible-story-folder { display: flex; gap: 4px; align-items: center; }
@media (prefers-reduced-motion: reduce) {
  .collapsible-story-content { animation-duration: 1ms; }
  .collapsible-story-indicator { transition: none; }
}
`;

const withStyles: Decorator = (Story) => (
  <>
    <style>{STYLES}</style>
    <Story />
  </>
);

const meta: Meta<typeof Collapsible.Root> = {
  title: 'Headless/Collapsible',
  component: Collapsible.Root,
  tags: ['autodocs'],
  decorators: [withStyles],
};

export default meta;

type Story = StoryObj<typeof meta>;

/** A chevron, drawn for the stories: Headless has no icons. */
function Chevron(): ReactElement {
  return (
    <Collapsible.Indicator className="collapsible-story-indicator">
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M4.5 2.5 8 6l-3.5 3.5" />
      </svg>
    </Collapsible.Indicator>
  );
}

/**
 * A trigger with a chevron, and content that grows to its height as it opens. Once closed, the
 * content stays mounted, `hidden`, after its animation.
 */
export const Default: Story = {
  render: (args) => (
    <Collapsible.Root {...args} className="collapsible-story">
      <Collapsible.Trigger className="collapsible-story-trigger">
        <Chevron />
        Shipping
      </Collapsible.Trigger>
      <Collapsible.Content className="collapsible-story-content">
        <p className="collapsible-story-body">
          Orders ship within two business days. Tracking arrives by email once the parcel leaves the
          warehouse.
        </p>
      </Collapsible.Content>
    </Collapsible.Root>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Shipping' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const content = canvas.getByText(/Orders ship/u).parentElement;
    await expect(trigger).toHaveAttribute('aria-controls', content?.id);
    await expect(content).toBeVisible();
    await waitFor(async () => {
      await expect(content?.style.getPropertyValue('--height')).toMatch(/^[1-9]\d*px$/u);
    });

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // Hidden once the closing animation is over.
    await waitFor(async () => {
      await expect(content).not.toBeVisible();
    });
  },
};

/** Open from the start: the content shows at once, without its open animation. */
export const DefaultOpen: Story = {
  ...Default,
  args: { defaultOpen: true },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Shipping' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const content = canvas.getByText(/Orders ship/u).parentElement;
    await expect(content).toHaveStyle({ 'animation-name': 'none' });
  },
};

/** Disabled: the trigger takes no clicks, and the content keeps its state. */
export const Disabled: Story = {
  ...Default,
  args: { disabled: true },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Shipping' });
    await expect(trigger).toBeDisabled();
    await expect(trigger).toHaveAttribute('data-disabled');
  },
};

/** A folder of a sidebar: its name links to its index page, and a button next to it toggles it. */
function Folder(): ReactElement {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible.Root
      open={open}
      onOpenChange={(details) => {
        setOpen(details.open);
      }}
      unmountOnExit
      className="collapsible-story"
    >
      <div className="collapsible-story-folder">
        <a href="#guide">Guide</a>
        <Collapsible.Trigger className="collapsible-story-trigger" aria-label="Guide pages">
          <Chevron />
        </Collapsible.Trigger>
      </div>
      <Collapsible.Content className="collapsible-story-content">
        <ul>
          <li>
            <a href="#installation">Installation</a>
          </li>
          <li>
            <a href="#themes">Themes</a>
          </li>
        </ul>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

/**
 * A controlled collapsible, as a sidebar folder: the folder's name is a link, and only the button
 * next to it opens and closes the pages.
 */
export const LinkAndTrigger: Story = {
  render: () => <Folder />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Guide pages' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByRole('link', { name: 'Themes' })).toBeVisible();

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await waitFor(async () => {
      await expect(canvas.queryByRole('link', { name: 'Themes' })).toBeNull();
    });
    await expect(canvas.getByRole('link', { name: 'Guide' })).toBeVisible();
  },
};
