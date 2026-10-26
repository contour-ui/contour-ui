import { describe, expect, it, vi } from 'vite-plus/test';

import { createService, createTestPlatform } from '../../machine/index.ts';
import { connect } from './dialog.connect.ts';
import { dialogMachine } from './dialog.machine.ts';
import type { DialogInput, DialogOpenChangeDetails } from './dialog.types.ts';

/** A started dialog on the test platform. */
function dialog(props: DialogInput) {
  const test = createTestPlatform(dialogMachine);
  const service = createService(dialogMachine, { props, platform: test.platform });
  service.start();
  return { service, test };
}

describe('dialog connect', () => {
  it('reads the state and props of the service, and sends its requests', () => {
    const { service } = dialog({ role: 'alertdialog' });

    const api = connect(service);
    expect(api).toMatchObject({ open: false, modal: true, role: 'alertdialog' });

    api.setOpen(true);
    expect(connect(service).open).toBe(true);
    // An API holds the values of the moment it was made: connect again after a change.
    expect(api.open).toBe(false);

    api.toggle();
    expect(connect(service).open).toBe(false);
    api.toggle();
    expect(connect(service).open).toBe(true);
    api.setOpen(false);
    expect(connect(service).open).toBe(false);
  });

  it('only reports the requests of a controlled dialog', () => {
    const onOpenChange = vi.fn<(details: DialogOpenChangeDetails) => void>();
    const { service, test } = dialog({ open: false, modal: false, onOpenChange });

    const api = connect(service);
    expect(api).toMatchObject({ open: false, modal: false, role: 'dialog' });

    api.setOpen(true);
    api.toggle();
    // Asking for the state it is in: nothing to report.
    api.setOpen(false);
    expect(connect(service).open).toBe(false);
    expect(test.log).toStrictEqual([]);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }], [{ open: true }]]);
  });
});
