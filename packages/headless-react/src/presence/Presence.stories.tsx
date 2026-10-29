import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Presence } from '../index.ts';
import type { PresenceProps } from '../index.ts';

/**
 * The stories' own styles, since Headless has none: the element fades and slides in while open,
 * and out once closed; with reduced motion, it only fades.
 */
const FADE = `
@keyframes presence-story-in { from { opacity: 0; translate: 0 -4px; } }
@keyframes presence-story-out { to { opacity: 0; translate: 0 -4px; } }
@keyframes presence-story-fade-in { from { opacity: 0; } }
@keyframes presence-story-fade-out { to { opacity: 0; } }
.presence-story { margin-block: 8px 0; padding: 8px 12px; border: 1px solid; border-radius: 4px; }
.presence-story[data-state='open'] { animation: presence-story-in 200ms ease-out; }
.presence-story[data-state='closed'] { animation: presence-story-out 150ms ease-in; }
@media (prefers-reduced-motion: reduce) {
  .presence-story[data-state='open'] { animation-name: presence-story-fade-in; }
  .presence-story[data-state='closed'] { animation-name: presence-story-fade-out; }
}
`;

const withStyles: Decorator = (Story) => (
  <>
    <style>{FADE}</style>
    <Story />
  </>
);

const meta: Meta<typeof Presence> = {
  title: 'Headless/Presence',
  component: Presence,
  tags: ['autodocs'],
  decorators: [withStyles],
  args: { present: true, className: 'presence-story', children: 'Ships in two days.' },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Shown while `present`: switch the control off to see it fade out, then hide. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const details = canvas.getByText('Ships in two days.');

    await expect(details).toHaveAttribute('data-scope', 'presence');
    await expect(details).toHaveAttribute('data-state', 'open');
    await expect(details).not.toHaveAttribute('hidden');
  },
};

/** A button that shows and hides the details, as the owner of a `Presence` would. */
function Disclosure(props: Omit<PresenceProps, 'present'>): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
        }}
      >
        Shipping
      </button>
      <Presence {...props} present={open} />
    </div>
  );
}

/**
 * The details stay mounted: once closed, they keep showing while their exit animation runs, then
 * get `hidden`.
 */
export const ExitAnimation: Story = {
  render: ({ present: _present, ...args }) => <Disclosure {...args} />,
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Shipping' });
    const details = canvas.getByText('Ships in two days.');
    await expect(details).toHaveAttribute('hidden');

    await userEvent.click(button);
    await expect(details).toHaveAttribute('data-state', 'open');
    await expect(details).not.toHaveAttribute('hidden');

    await userEvent.click(button);
    await expect(details).toHaveAttribute('data-state', 'closed');
    // Still shown, but no longer interactive, until the animation ends.
    await expect(details).not.toHaveAttribute('hidden');
    await expect(details).toHaveAttribute('inert');
    await waitFor(async () => {
      await expect(details).toHaveAttribute('hidden');
    });
    await expect(details).not.toHaveAttribute('inert');
  },
};

/** `lazyMount` and `unmountOnExit`: the details are in the DOM only while they show. */
export const UnmountOnExit: Story = {
  args: { lazyMount: true, unmountOnExit: true },
  render: ({ present: _present, ...args }) => <Disclosure {...args} />,
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Shipping' });
    await expect(canvas.queryByText('Ships in two days.')).not.toBeInTheDocument();

    await userEvent.click(button);
    const details = canvas.getByText('Ships in two days.');
    await expect(details).toHaveAttribute('data-state', 'open');

    await userEvent.click(button);
    await expect(details).toBeInTheDocument();
    await waitFor(async () => {
      await expect(details).not.toBeInTheDocument();
    });
  },
};

/** Without an exit animation, the details hide as soon as they close. */
export const WithoutAnimation: Story = {
  args: { className: undefined, style: { marginBlockStart: 8 } },
  render: ({ present: _present, ...args }) => <Disclosure {...args} />,
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Shipping' });
    const details = canvas.getByText('Ships in two days.');

    await userEvent.click(button);
    await expect(details).not.toHaveAttribute('hidden');
    await userEvent.click(button);
    await expect(details).toHaveAttribute('hidden');
  },
};
