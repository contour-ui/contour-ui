import { describe, expect, it } from 'vite-plus/test';

import { createService, createTestPlatform } from '../../machine/index.ts';
import { connect } from './collapsible.connect.ts';
import { collapsibleMachine } from './collapsible.machine.ts';

describe('collapsible connect', () => {
  it('reads the state and the props of the service, and sends its requests', () => {
    const test = createTestPlatform(collapsibleMachine);
    const service = createService(collapsibleMachine, { props: {}, platform: test.platform });
    service.start();

    const api = connect(service);
    expect(api).toMatchObject({ open: false, disabled: false });

    api.setOpen(true);
    expect(connect(service).open).toBe(true);
    api.setOpen(true);
    expect(connect(service).open).toBe(true);
    api.toggle();
    expect(connect(service).open).toBe(false);
    // An API holds the values of the moment it was made: connect again after a change.
    expect(api.open).toBe(false);

    service.setProps({ disabled: true });
    expect(connect(service).disabled).toBe(true);
  });
});
