import { describe, expect, it, vi } from 'vite-plus/test';

import { createService, createTestPlatform } from '../../machine/index.ts';
import type { TestPlatformOverrides } from '../../machine/index.ts';
import { connect } from './popover.connect.ts';
import { popoverMachine } from './popover.machine.ts';
import type { PopoverInput, PopoverOpenChangeDetails, PopoverSchema } from './popover.types.ts';

/** A started popover on the test platform. */
function popover(props: PopoverInput = {}, overrides?: TestPlatformOverrides<PopoverSchema>) {
  const test = createTestPlatform(popoverMachine, overrides);
  const service = createService(popoverMachine, { props, platform: test.platform });
  service.start();
  return { service, test };
}

describe('popover connect', () => {
  it('reads the state, the props and the placement of the service', () => {
    const { service } = popover(
      { modal: true, portalled: false, positioning: { placement: 'top' } },
      {
        effects: {
          position: ({ context }) => {
            context.set('placement', 'bottom');
            return undefined;
          },
        },
      },
    );

    const api = connect(service);
    expect(api).toMatchObject({ open: false, modal: true, portalled: false, placement: 'top' });

    api.toggle();
    expect(connect(service)).toMatchObject({ open: true, placement: 'bottom' });
    // An API holds the values of the moment it was made: connect again after a change.
    expect(api).toMatchObject({ open: false, placement: 'top' });

    expect(connect(popover().service)).toMatchObject({ modal: false, portalled: true });
  });

  it('sends the requests of the parts', () => {
    const { service, test } = popover();
    const api = connect(service);

    api.setOpen(true);
    expect(service.matches('open')).toBe(true);
    // A request for the current state does nothing.
    api.setOpen(true);
    expect(test.log.filter((line) => line === 'run setInitialFocus')).toHaveLength(1);

    api.setOpen(false);
    expect(service.matches('closed')).toBe(true);

    api.toggle();
    expect(service.matches('open')).toBe(true);
    api.toggle();
    expect(service.matches('closed')).toBe(true);
  });

  it('only reports the requests while `open` is controlled', () => {
    const onOpenChange = vi.fn<(details: PopoverOpenChangeDetails) => void>();
    const { service } = popover({ open: false, onOpenChange });
    const api = connect(service);

    api.toggle();
    api.setOpen(true);
    expect(connect(service).open).toBe(false);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }], [{ open: true }]]);

    service.setProps({ open: true, onOpenChange });
    service.syncProps();
    expect(connect(service).open).toBe(true);
  });
});
