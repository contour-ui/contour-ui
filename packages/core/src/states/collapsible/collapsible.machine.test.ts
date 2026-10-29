import { describe, expect, it, vi } from 'vite-plus/test';

import { createService, createTestPlatform } from '../../machine/index.ts';
import type { Service } from '../../machine/index.ts';
import { collapsibleMachine } from './collapsible.machine.ts';
import type {
  CollapsibleInput,
  CollapsibleOpenChangeDetails,
  CollapsibleSchema,
} from './collapsible.types.ts';

/** A started collapsible on the test platform. */
function collapsible(props: CollapsibleInput = {}) {
  const test = createTestPlatform(collapsibleMachine);
  const service = createService(collapsibleMachine, { props, platform: test.platform });
  service.start();
  return { service, test };
}

/** Pass new props, as an adapter does on render, and follow them, as it does after the commit. */
function rerender(service: Service<CollapsibleSchema>, props: CollapsibleInput): void {
  service.setProps(props);
  service.syncProps();
}

const openChangeSpy = () => vi.fn<(details: CollapsibleOpenChangeDetails) => void>();

describe('collapsible machine', () => {
  it('starts closed, or open with `defaultOpen` or `open`, and asks nothing of the platform', () => {
    const { service, test } = collapsible();
    expect(service.matches('closed')).toBe(true);
    expect(collapsible({ defaultOpen: true }).service.matches('open')).toBe(true);
    expect(collapsible({ open: true, defaultOpen: false }).service.matches('open')).toBe(true);
    expect(collapsible({ open: false, defaultOpen: true }).service.matches('closed')).toBe(true);

    service.send({ type: 'TOGGLE' });
    service.send({ type: 'TOGGLE' });
    expect(test.log).toStrictEqual([]);
  });

  it('opens and closes on requests, and reports each change', () => {
    const onOpenChange = openChangeSpy();
    const { service } = collapsible({ onOpenChange });

    service.send({ type: 'OPEN' });
    expect(service.matches('open')).toBe(true);
    service.send({ type: 'OPEN' });
    service.send({ type: 'CLOSE' });
    expect(service.matches('closed')).toBe(true);
    service.send({ type: 'CLOSE' });
    service.send({ type: 'TOGGLE' });
    expect(service.matches('open')).toBe(true);
    service.send({ type: 'TOGGLE' });
    expect(service.matches('closed')).toBe(true);

    // Requests for the current state report nothing.
    expect(onOpenChange.mock.calls).toStrictEqual([
      [{ open: true }],
      [{ open: false }],
      [{ open: true }],
      [{ open: false }],
    ]);
  });

  it('ignores every request while disabled, and takes them again once enabled', () => {
    const onOpenChange = openChangeSpy();
    const { service } = collapsible({ disabled: true, onOpenChange });

    service.send({ type: 'OPEN' });
    service.send({ type: 'TOGGLE' });
    expect(service.matches('closed')).toBe(true);

    rerender(service, { disabled: false, onOpenChange });
    service.send({ type: 'TOGGLE' });
    expect(service.matches('open')).toBe(true);

    rerender(service, { disabled: true, onOpenChange });
    service.send({ type: 'CLOSE' });
    service.send({ type: 'TOGGLE' });
    expect(service.matches('open')).toBe(true);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }]]);
  });

  it('only reports requests while `open` is controlled, and follows the prop', () => {
    const onOpenChange = openChangeSpy();
    const { service } = collapsible({ open: false, onOpenChange });

    service.send({ type: 'TOGGLE' });
    expect(service.matches('closed')).toBe(true);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }]]);

    rerender(service, { open: true, onOpenChange });
    expect(service.matches('open')).toBe(true);
    service.send({ type: 'CLOSE' });
    expect(service.matches('open')).toBe(true);
    expect(onOpenChange.mock.calls).toStrictEqual([[{ open: true }], [{ open: false }]]);

    // Following the prop reports nothing, disabled or not.
    rerender(service, { open: false, disabled: true, onOpenChange });
    expect(service.matches('closed')).toBe(true);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });

  it('keeps its state when the owner hands it back with `open: undefined`', () => {
    const { service } = collapsible({ open: true });

    rerender(service, {});
    expect(service.matches('open')).toBe(true);
    service.send({ type: 'TOGGLE' });
    expect(service.matches('closed')).toBe(true);
  });
});
