import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactElement } from 'react';
import { expect, screen, userEvent, waitFor } from 'storybook/test';

import { Button, Dialog, Portal } from '../index.ts';

const meta: Meta<typeof Dialog.Root> = {
  title: 'Essentials/Dialog',
  component: Dialog.Root,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/** A field of the stories: a label over a text input, in the look of the page. */
function Field({ label, value }: { readonly label: string; readonly value: string }): ReactElement {
  return (
    <label style={{ display: 'grid', gap: vars.space['control-gap'] }}>
      {label}
      <input
        defaultValue={value}
        style={{
          blockSize: vars.size['control-md'],
          paddingInline: vars.space['control-inset'],
          border: `${vars['border-width'].default} solid ${vars.color.border.default}`,
          borderRadius: vars.radius.control,
          background: 'transparent',
          color: 'inherit',
          font: 'inherit',
        }}
      />
    </label>
  );
}

/** The export dialog: the x, a header, a body with fields and a footer with two actions. */
function ExportDialog(props: Dialog.RootProps): ReactElement {
  return (
    <Dialog.Root {...props}>
      <Dialog.Trigger asChild>
        <Button>Export</Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.CloseTrigger />
            <Dialog.Header>
              <Dialog.Title>Export the mix</Dialog.Title>
              <Dialog.Description>Render the session to an audio file.</Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
              <Field label="File name" value="Live set" />
              <Field label="Sample rate" value="48 kHz" />
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.CloseTrigger>
              <Button>Export</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

/**
 * Open from the start: the scrim over the page, and the dialog in the middle with the x in its
 * corner, a header, a body and the actions at the end of the footer. Focus is on the x, the
 * first element.
 */
export const Default: Story = {
  render: () => <ExportDialog defaultOpen />,
  play: async () => {
    const dialog = screen.getByRole('dialog', { name: 'Export the mix' });
    await expect(dialog).toHaveClass('contour-dialog__content');
    await expect(dialog).toHaveAttribute('data-size', 'md');
    await waitFor(async () => {
      await expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    });
  },
};

/**
 * The trigger opens the dialog; Tab goes round its elements; Escape closes it, and focus goes
 * back to the trigger; so does a press on the backdrop.
 */
export const Interaction: Story = {
  tags: ['!visual'],
  render: () => <ExportDialog />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Export' });
    await userEvent.click(trigger);
    const close = screen.getByRole('button', { name: 'Close' });
    await waitFor(async () => {
      await expect(close).toHaveFocus();
    });

    // From the last element round to the first.
    await userEvent.tab({ shift: true });
    await expect(screen.getAllByRole('button', { name: 'Export' }).at(-1)).toHaveFocus();
    await userEvent.tab();
    await expect(close).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    await waitFor(async () => {
      await expect(trigger).toHaveFocus();
    });

    await userEvent.click(trigger);
    await waitFor(async () => {
      await expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    });
    await userEvent.click(document.querySelector('.contour-dialog__backdrop') ?? document.body);
    await waitFor(async () => {
      await expect(trigger).toHaveFocus();
    });
  },
};

/**
 * The sizes, `sm`, `md` and `lg`: the widest each dialog grows. Shown in place, without an
 * overlay, as non-modal dialogs.
 */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: vars.space['section-gap'] }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Dialog.Root key={size} size={size} modal={false} defaultOpen>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>{`Size ${size}`}</Dialog.Title>
              <Dialog.Description>The widest the dialog grows.</Dialog.Description>
            </Dialog.Header>
          </Dialog.Content>
        </Dialog.Root>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    // The layout width: the box grows in from a smaller scale.
    const widths = ['sm', 'md', 'lg'].map(
      (size) => canvas.getByRole('dialog', { name: `Size ${size}` }).offsetWidth,
    );
    await expect(widths).toStrictEqual([400, 560, 800]);
  },
};

/** Near the top, as a search: the dialog grows down as its results change. */
export const Top: Story = {
  render: () => (
    <Dialog.Root defaultOpen placement="top">
      <Dialog.Trigger asChild>
        <Button variant="outline">Search</Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content aria-label="Search the docs">
            <Field label="Search" value="dialog" />
            <Dialog.Body>
              <p style={{ margin: 0 }}>Dialog — Essentials</p>
              <p style={{ margin: 0 }}>Dialog — Headless</p>
              <p style={{ margin: 0 }}>Drawer — Essentials</p>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  ),
  play: async () => {
    const dialog = screen.getByRole('dialog', { name: 'Search the docs' });
    await expect(dialog).toHaveAttribute('data-placement', 'top');
    await waitFor(async () => {
      await expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus();
    });
  },
};

/**
 * An alert dialog asks for an answer: small, without the x, the safe answer first. It focuses
 * that answer, and a press on the backdrop leaves it open.
 */
export const AlertDialog: Story = {
  render: () => (
    <Dialog.Root defaultOpen role="alertdialog" size="sm">
      <Dialog.Trigger asChild>
        <Button variant="outline">Delete the take</Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Delete the take?</Dialog.Title>
              <Dialog.Description>It is gone for good.</Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button variant="outline">Keep it</Button>
              </Dialog.CloseTrigger>
              <Dialog.CloseTrigger asChild>
                <Button>Delete</Button>
              </Dialog.CloseTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  ),
  play: async () => {
    const dialog = screen.getByRole('alertdialog', { name: 'Delete the take?' });
    await waitFor(async () => {
      await expect(screen.getByRole('button', { name: 'Keep it' })).toHaveFocus();
    });
    await userEvent.click(document.querySelector('.contour-dialog__backdrop') ?? document.body);
    await expect(dialog).toHaveAttribute('data-state', 'open');
  },
};

/**
 * A body longer than the viewport scrolls between the header and the footer. It holds only
 * text, so it takes focus itself (`tabIndex={0}`): the arrow keys scroll it.
 */
export const LongContent: Story = {
  render: () => (
    <Dialog.Root defaultOpen size="sm">
      <Dialog.Trigger asChild>
        <Button variant="outline">Release notes</Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.CloseTrigger />
            <Dialog.Header>
              <Dialog.Title>Release notes</Dialog.Title>
            </Dialog.Header>
            {/* Only text: focusable, so the keyboard scrolls it. */}
            <Dialog.Body tabIndex={0}>
              {Array.from({ length: 40 }, (_, index) => (
                <p key={index} style={{ margin: 0 }}>
                  {`Fixed issue ${index + 1}.`}
                </p>
              ))}
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button>Done</Button>
              </Dialog.CloseTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  ),
  play: async () => {
    const done = screen.getByRole('button', { name: 'Done' });
    const box = done.getBoundingClientRect();
    await expect(box.bottom).toBeLessThanOrEqual(window.innerHeight);
  },
};
