import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Popover, Portal } from '../index.ts';

/**
 * The stories' own styles, since Headless has none: a framed content that fades and grows from
 * the edge next to its trigger (`--transform-origin`), above the page (`--layer-index`).
 */
const STYLES = `
@keyframes popover-story-in { from { opacity: 0; scale: 0.96; } }
@keyframes popover-story-out { to { opacity: 0; scale: 0.96; } }
.popover-story-positioner { z-index: calc(1000 + var(--layer-index, 0)); }
.popover-story-content {
  display: grid;
  gap: 8px;
  max-inline-size: 18rem;
  padding: 12px;
  border: 1px solid;
  border-radius: 6px;
  background: Canvas;
  color: CanvasText;
  transform-origin: var(--transform-origin);
}
.popover-story-content[hidden] { display: none; }
.popover-story-content[data-state='open'] { animation: popover-story-in 150ms ease-out; }
.popover-story-content[data-state='closed'] { animation: popover-story-out 100ms ease-in; }
.popover-story-content:focus-visible { outline: 2px solid; }
.popover-story-title { font-weight: 600; }
@media (prefers-reduced-motion: reduce) {
  .popover-story-content { animation-duration: 1ms; }
}
`;

const withStyles: Decorator = (Story) => (
  <>
    <style>{STYLES}</style>
    <Story />
  </>
);

const meta: Meta<typeof Popover.Root> = {
  title: 'Headless/Popover',
  component: Popover.Root,
  tags: ['autodocs'],
  decorators: [withStyles],
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The content of a share popover, portalled to the end of the page: a title, a description, a
 * field and a close trigger.
 */
function ShareContent(): ReactElement {
  return (
    <Portal>
      <Popover.Positioner className="popover-story-positioner">
        <Popover.Content className="popover-story-content">
          <Popover.Title className="popover-story-title">Share this page</Popover.Title>
          <Popover.Description>Anyone with the link can view it.</Popover.Description>
          <input aria-label="Link" defaultValue="https://contour-ui.dev/docs" />
          <Popover.CloseTrigger>Done</Popover.CloseTrigger>
        </Popover.Content>
      </Popover.Positioner>
    </Portal>
  );
}

/**
 * A trigger and its popover, portalled to the end of the page. Opening moves focus to the field;
 * Escape, a press outside or Done closes it and sends focus back to the trigger. Tab keeps the
 * content right after the trigger.
 */
export const Default: Story = {
  render: (args) => (
    <>
      <Popover.Root {...args}>
        <Popover.Trigger>Share</Popover.Trigger>
        <ShareContent />
      </Popover.Root>{' '}
      <button type="button">Next</button>
    </>
  ),
  play: async ({ canvas }) => {
    const page = within(document.body);
    const trigger = canvas.getByRole('button', { name: 'Share' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger);
    const dialog = page.getByRole('dialog', { name: 'Share this page' });
    await expect(dialog).toHaveAccessibleDescription('Anyone with the link can view it.');
    await expect(trigger).toHaveAttribute('aria-controls', dialog.id);
    await waitFor(async () => {
      await expect(page.getByRole('textbox', { name: 'Link' })).toHaveFocus();
    });

    // Tab: on to Done, then out of the content to what follows the trigger, which closes it.
    await userEvent.tab();
    await expect(page.getByRole('button', { name: 'Done' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Next' })).toHaveFocus();
    await waitFor(async () => {
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    await userEvent.click(trigger);
    await waitFor(async () => {
      await expect(page.getByRole('textbox', { name: 'Link' })).toHaveFocus();
    });
    await userEvent.keyboard('{Escape}');
    await waitFor(async () => {
      await expect(trigger).toHaveFocus();
    });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  },
};

/** Opens on mount, placed above its trigger: an open state to look at. */
export const DefaultOpen: Story = {
  args: { defaultOpen: true, positioning: { placement: 'top-start' } },
  render: (args) => (
    <div style={{ paddingBlockStart: '10rem' }}>
      <Popover.Root {...args}>
        <Popover.Trigger>Share</Popover.Trigger>
        <ShareContent />
      </Popover.Root>
    </div>
  ),
  play: async ({ canvas }) => {
    const dialog = within(document.body).getByRole('dialog', { name: 'Share this page' });
    await expect(canvas.getByRole('button', { name: 'Share' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await waitFor(async () => {
      await expect(dialog).toHaveAttribute('data-placement', 'top-start');
    });
  },
};

/** The owner keeps `open` in its state: the popover only reports requests, and follows it. */
function ControlledPopover(): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Popover.Root
        open={open}
        onOpenChange={(details) => {
          setOpen(details.open);
        }}
      >
        <Popover.Trigger>Share</Popover.Trigger>
        <ShareContent />
      </Popover.Root>{' '}
      <output>{open ? 'Open' : 'Closed'}</output>
    </>
  );
}

/** A controlled `open`: the text next to the trigger shows the owner's state. */
export const Controlled: Story = {
  render: () => <ControlledPopover />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Closed')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Share' }));
    await expect(canvas.getByText('Open')).toBeInTheDocument();
    await userEvent.click(within(document.body).getByRole('button', { name: 'Done' }));
    await waitFor(async () => {
      await expect(canvas.getByText('Closed')).toBeInTheDocument();
    });
  },
};

/**
 * A modal popover: while it is open, the rest of the page is inert, the page does not scroll,
 * and Tab goes round the content. The trigger stays reachable.
 */
export const Modal: Story = {
  args: { modal: true },
  render: (args) => (
    <>
      <button type="button">Before</button>{' '}
      <Popover.Root {...args}>
        <Popover.Trigger>Share</Popover.Trigger>
        <ShareContent />
      </Popover.Root>
    </>
  ),
  play: async ({ canvas }) => {
    const page = within(document.body);
    const trigger = canvas.getByRole('button', { name: 'Share' });
    await userEvent.click(trigger);
    await expect(page.getByRole('dialog', { name: 'Share this page' })).toHaveAttribute(
      'aria-modal',
      'true',
    );
    const link = page.getByRole('textbox', { name: 'Link' });
    await waitFor(async () => {
      await expect(link).toHaveFocus();
    });
    await waitFor(async () => {
      await expect(canvas.getByText('Before').closest('[inert]')).not.toBeNull();
    });

    await userEvent.tab();
    await userEvent.tab();
    await expect(link).toHaveFocus();

    await userEvent.click(trigger);
    await waitFor(async () => {
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
    await expect(canvas.getByText('Before').closest('[inert]')).toBeNull();
  },
};

/**
 * A popover opened from another one: Escape and a press outside close the top-most one first,
 * and a press inside the inner one keeps both open.
 */
export const Nested: Story = {
  render: () => (
    <Popover.Root>
      <Popover.Trigger>Settings</Popover.Trigger>
      <Portal>
        <Popover.Positioner className="popover-story-positioner">
          <Popover.Content className="popover-story-content" aria-label="Settings">
            <label>
              <input type="checkbox" /> Snap to grid
            </label>
            <Popover.Root positioning={{ placement: 'right-start' }}>
              <Popover.Trigger>Advanced</Popover.Trigger>
              <Portal>
                <Popover.Positioner className="popover-story-positioner">
                  <Popover.Content className="popover-story-content" aria-label="Advanced">
                    <button type="button">Reset all</button>
                  </Popover.Content>
                </Popover.Positioner>
              </Portal>
            </Popover.Root>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  ),
  play: async ({ canvas }) => {
    const page = within(document.body);
    await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
    await userEvent.click(page.getByRole('button', { name: 'Advanced' }));
    const reset = page.getByRole('button', { name: 'Reset all' });
    await waitFor(async () => {
      await expect(reset).toHaveFocus();
    });
    await userEvent.click(reset);
    // Visible once their enter animation has faded them in.
    await waitFor(async () => {
      await expect(page.getByRole('dialog', { name: 'Advanced' })).toBeVisible();
    });

    // Each Escape closes the top-most popover; a closed one is hidden once its exit animation ends.
    await userEvent.keyboard('{Escape}');
    await waitFor(async () => {
      await expect(page.queryByRole('dialog', { name: 'Advanced' })).not.toBeInTheDocument();
    });
    await waitFor(async () => {
      await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    });
    await userEvent.keyboard('{Escape}');
    await waitFor(async () => {
      await expect(page.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument();
    });
  },
};

/** The content is placed next to `Popover.Anchor`, a field with the trigger at its end. */
export const WithAnchor: Story = {
  args: { positioning: { placement: 'bottom-end' } },
  render: (args) => (
    <Popover.Root {...args}>
      <Popover.Anchor style={{ display: 'inline-flex', gap: 4 }}>
        <input aria-label="Color" defaultValue="#3b82f6" />
        <Popover.Trigger>Pick</Popover.Trigger>
      </Popover.Anchor>
      <Portal>
        <Popover.Positioner className="popover-story-positioner">
          <Popover.Content className="popover-story-content" aria-label="Colors">
            <button type="button">Blue</button>
            <button type="button">Green</button>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Pick' }));
    const dialog = within(document.body).getByRole('dialog', { name: 'Colors' });
    await waitFor(async () => {
      await expect(dialog).toHaveAttribute('data-placement', 'bottom-end');
    });
  },
};
