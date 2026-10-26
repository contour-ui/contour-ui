import type { dialog } from '@contour-ui/core';
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test';

import { Dialog, Portal } from '../index.ts';

/**
 * Headless renders no CSS: just enough here for an overlay. The backdrop and the positioner
 * cover the viewport, the positioner lets presses through to the backdrop, and the content
 * sits in the middle. Both fade in and out; the content also grows in, unless motion is
 * reduced.
 */
const css = `
@keyframes dialog-story-fade-in { from { opacity: 0; } }
@keyframes dialog-story-fade-out { to { opacity: 0; } }
@keyframes dialog-story-in { from { opacity: 0; scale: 0.96; } }
@keyframes dialog-story-out { to { opacity: 0; scale: 0.96; } }
.dialog-story-backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / 0.4); }
.dialog-story-backdrop[data-state='open'] { animation: dialog-story-fade-in 150ms ease-out; }
.dialog-story-backdrop[data-state='closed'] { animation: dialog-story-fade-out 100ms ease-in; }
.dialog-story-positioner {
  position: fixed; inset: 0; display: grid; place-items: center; padding: 16px;
  pointer-events: none;
}
.dialog-story-positioner[hidden] { display: none; }
.dialog-story-content {
  display: flex; flex-direction: column; gap: 8px; inline-size: min(100%, 24rem);
  padding: 16px; border: 1px solid; border-radius: 8px; background: white; color: black;
  pointer-events: auto;
}
.dialog-story-content[hidden] { display: none; }
.dialog-story-content[data-state='open'] { animation: dialog-story-in 150ms ease-out; }
.dialog-story-content[data-state='closed'] { animation: dialog-story-out 100ms ease-in; }
.dialog-story-content h2, .dialog-story-content p { margin: 0; }
@media (prefers-reduced-motion: reduce) {
  .dialog-story-content[data-state='open'] { animation-name: dialog-story-fade-in; }
  .dialog-story-content[data-state='closed'] { animation-name: dialog-story-fade-out; }
}
`;

const withStyles: Decorator = (Story) => (
  <>
    <style>{css}</style>
    <Story />
  </>
);

/** Reports the requests of the stories, as an owner would act on them. */
const onOpenChange = fn<(details: dialog.OpenChangeDetails) => void>().mockName('onOpenChange');

const meta: Meta<typeof Dialog.Root> = {
  title: 'Headless/Dialog',
  component: Dialog.Root,
  tags: ['autodocs'],
  decorators: [withStyles],
  beforeEach: () => {
    onOpenChange.mockClear();
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

interface OverlayProps {
  /** Whether to render the backdrop: a non-modal dialog has none. */
  readonly backdrop?: boolean | undefined;
  readonly children: ReactNode;
}

/** The overlay of a dialog in a portal: the backdrop, the positioner and the content. */
function Overlay({ backdrop = true, children }: OverlayProps): ReactElement {
  return (
    <Portal>
      {backdrop ? <Dialog.Backdrop className="dialog-story-backdrop" /> : null}
      <Dialog.Positioner className="dialog-story-positioner">
        <Dialog.Content className="dialog-story-content">{children}</Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  );
}

/** The content of the rename dialog: a field, and the buttons that close it. */
function RenameContent(): ReactElement {
  return (
    <>
      <Dialog.Title>Rename the track</Dialog.Title>
      <Dialog.Description>The new name shows in the mixer.</Dialog.Description>
      <label>
        Name <input defaultValue="Drums" />
      </label>
      <div>
        <Dialog.CloseTrigger>Cancel</Dialog.CloseTrigger>{' '}
        <Dialog.CloseTrigger>Save</Dialog.CloseTrigger>
      </div>
    </>
  );
}

/**
 * A modal dialog. The trigger opens it, and focus moves to its first field; Tab and Shift+Tab
 * go round its elements; Escape, a press on the backdrop and the close triggers close it, and
 * focus goes back to the trigger.
 */
export const Default: Story = {
  render: () => (
    <Dialog.Root onOpenChange={onOpenChange}>
      <Dialog.Trigger>Rename</Dialog.Trigger>
      <Overlay>
        <RenameContent />
      </Overlay>
    </Dialog.Root>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Rename' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger);
    const dialogElement = screen.getByRole('dialog', { name: 'Rename the track' });
    await expect(dialogElement).toHaveAttribute('aria-modal', 'true');
    await expect(dialogElement).toHaveAccessibleDescription('The new name shows in the mixer.');
    const field = screen.getByRole('textbox', { name: 'Name' });
    await waitFor(async () => {
      await expect(field).toHaveFocus();
    });

    // Tab goes round: from the last button back to the field.
    await userEvent.tab();
    await userEvent.tab();
    await expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    await userEvent.tab();
    await expect(field).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    await waitFor(async () => {
      await expect(trigger).toHaveFocus();
    });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }], [{ open: false }]]);
  },
};

/** Open from the start (`defaultOpen`): the accessibility check sees the open dialog. */
export const Open: Story = {
  render: () => (
    <Dialog.Root defaultOpen>
      <Dialog.Trigger>Rename</Dialog.Trigger>
      <Overlay>
        <RenameContent />
      </Overlay>
    </Dialog.Root>
  ),
  play: async () => {
    await waitFor(async () => {
      await expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    });
    // Not `toBeVisible`: the content fades in, from an opacity of 0.
    await expect(screen.getByRole('dialog', { name: 'Rename the track' })).not.toHaveAttribute(
      'hidden',
    );
  },
};

/**
 * An alert dialog asks for an answer: it focuses its first close trigger, the safe one, and a
 * press on the backdrop leaves it open. Escape still closes it.
 */
export const AlertDialog: Story = {
  render: () => (
    <Dialog.Root role="alertdialog">
      <Dialog.Trigger>Delete the take</Dialog.Trigger>
      <Overlay>
        <Dialog.Title>Delete the take?</Dialog.Title>
        <Dialog.Description>It is gone for good.</Dialog.Description>
        <div>
          <Dialog.CloseTrigger>Keep it</Dialog.CloseTrigger>{' '}
          <Dialog.CloseTrigger>Delete</Dialog.CloseTrigger>
        </div>
      </Overlay>
    </Dialog.Root>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete the take' }));
    const alert = screen.getByRole('alertdialog', { name: 'Delete the take?' });
    await waitFor(async () => {
      await expect(screen.getByRole('button', { name: 'Keep it' })).toHaveFocus();
    });

    await userEvent.click(document.querySelector('.dialog-story-backdrop') ?? document.body);
    await expect(alert).toHaveAttribute('data-state', 'open');
  },
};

/** A controlled dialog: the owner keeps `open` in its state and opens it from elsewhere too. */
function OwnedDialog(): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Dialog.Root
        open={open}
        onOpenChange={(details) => {
          onOpenChange(details);
          setOpen(details.open);
        }}
      >
        <Dialog.Trigger>Rename</Dialog.Trigger>
        <Overlay>
          <RenameContent />
        </Overlay>
      </Dialog.Root>{' '}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Rename from the menu
      </button>
    </>
  );
}

/**
 * `open` and `onOpenChange`: the dialog only reports its requests, and opens or closes when the
 * owner passes the new state, here from a second button too.
 */
export const Controlled: Story = {
  render: () => <OwnedDialog />,
  play: async ({ canvas }) => {
    const menuButton = canvas.getByRole('button', { name: 'Rename from the menu' });
    await userEvent.click(menuButton);
    await waitFor(async () => {
      await expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
    });
    // The owner opened it: nothing to report.
    await expect(onOpenChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await expect(onOpenChange.mock.calls).toStrictEqual([[{ open: false }]]);
    // Focus goes back to where it was when the dialog opened.
    await waitFor(async () => {
      await expect(menuButton).toHaveFocus();
    });
  },
};

/**
 * A dialog opened from another one, each in a portal: Escape and presses outside close the
 * top one first, and focus goes back to its trigger in the dialog below.
 */
export const Nested: Story = {
  render: () => (
    <Dialog.Root>
      <Dialog.Trigger>Project settings</Dialog.Trigger>
      <Overlay>
        <Dialog.Title>Project settings</Dialog.Title>
        <Dialog.Description>Sample rate, tempo and storage.</Dialog.Description>
        <Dialog.Root role="alertdialog">
          <Dialog.Trigger>Delete the project</Dialog.Trigger>
          <Overlay>
            <Dialog.Title>Delete the project?</Dialog.Title>
            <Dialog.CloseTrigger>Keep it</Dialog.CloseTrigger>
          </Overlay>
        </Dialog.Root>
        <Dialog.CloseTrigger>Done</Dialog.CloseTrigger>
      </Overlay>
    </Dialog.Root>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Project settings' }));
    const inner = screen.getByRole('button', { name: 'Delete the project' });
    await waitFor(async () => {
      await expect(inner).toHaveFocus();
    });
    await userEvent.click(inner);
    await waitFor(async () => {
      await expect(screen.getByRole('button', { name: 'Keep it' })).toHaveFocus();
    });

    await userEvent.keyboard('{Escape}');
    await waitFor(async () => {
      await expect(inner).toHaveFocus();
    });
    await expect(screen.getByRole('dialog', { name: 'Project settings' })).toHaveAttribute(
      'data-state',
      'open',
    );
  },
};

/**
 * A non-modal dialog, such as an inspector: the page stays within reach, and so does its
 * trigger, which closes it again. It has no backdrop.
 */
export const NonModal: Story = {
  render: () => (
    <Dialog.Root modal={false}>
      <Dialog.Trigger>Inspector</Dialog.Trigger> <button type="button">Play</button>
      <Overlay backdrop={false}>
        <Dialog.Title>Inspector</Dialog.Title>
        <Dialog.Description>Gain −3 dB, pan center.</Dialog.Description>
        <Dialog.CloseTrigger>Close</Dialog.CloseTrigger>
      </Overlay>
    </Dialog.Root>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Inspector' });
    await userEvent.click(trigger);
    const panel = screen.getByRole('dialog', { name: 'Inspector' });
    await expect(panel).not.toHaveAttribute('aria-modal');
    // Focus moves in on the frame after the click.
    await waitFor(async () => {
      await expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    });

    await userEvent.click(canvas.getByRole('button', { name: 'Play' }));
    await expect(canvas.getByRole('button', { name: 'Play' })).toHaveFocus();
    await expect(panel).toHaveAttribute('data-state', 'open');

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  },
};
