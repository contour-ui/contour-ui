import { vars } from '@contour-ui/tokens';
import type { ReactElement } from 'react';
import { page } from 'vite-plus/test/browser';

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

visualStates({
  default: {
    render: () => <ExportDialog />,
    target: 'page',
    // Focus moves to the x as the overlay opens.
    focused: () => page.getByRole('button', { name: 'Close', exact: true }),
  },
});
