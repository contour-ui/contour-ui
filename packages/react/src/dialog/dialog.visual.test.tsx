import { vars } from '@contour-ui/tokens';
import type { ReactElement } from 'react';
import { vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';

import { Button, Dialog, Portal } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

/** A label over a text input, in the look of the page. */
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

/** The dialog of the Default story, open from the start over the page. */
function ExportDialog(): ReactElement {
  return (
    <Dialog.Root defaultOpen>
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

/** The backdrop of the open dialog. */
function backdrop(): Element {
  const element = document.querySelector('.contour-dialog__backdrop');
  if (element === null) {
    throw new Error('The dialog has no backdrop.');
  }
  return element;
}

visualStates({
  default: {
    render: () => <ExportDialog />,
    target: 'page',
    // Focus moves to the x as the overlay opens.
    focused: () => page.getByRole('button', { name: 'Close', exact: true }),
  },
  // The sizes, `sm`, `md` and `lg`: the widest each dialog grows. Shown in place, without an
  // overlay, as non-modal dialogs.
  sizes: {
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
  },
  // Near the top, as a search: the dialog grows down as its results change.
  top: {
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
    target: 'page',
    // Focus moves to the field, the first element, as the overlay opens.
    focused: () => page.getByRole('textbox', { name: 'Search' }),
  },
  // An alert dialog asks for an answer: small, without the x, the safe answer first.
  'alert-dialog': {
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
    target: 'page',
    // As the story's play: once the dialog has focused the safe answer, a press on the backdrop,
    // which leaves it open and takes the focus off the answer. Pressed at its corner: its middle
    // is under the dialog.
    ready: async () => {
      const keep = page.getByRole('button', { name: 'Keep it' });
      await vi.waitFor(() => {
        if (document.activeElement !== keep.element()) {
          throw new Error('The dialog has not focused its safe answer yet.');
        }
      });
      await userEvent.click(backdrop(), { position: { x: 1, y: 1 } });
    },
  },
  // A body longer than the viewport scrolls between the header and the footer.
  'long-content': {
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
    target: 'page',
    // Focus moves to the x as the overlay opens.
    focused: () => page.getByRole('button', { name: 'Close', exact: true }),
  },
});
