import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';

import { createService } from '../machine/index.ts';
import type { Machine, MachineSchema, Platform, Service } from '../machine/index.ts';

/**
 * Run a machine in a component and re-render when its snapshot changes.
 *
 * - The service is created once, on the first render, and started after mount; it stops when
 *   the component unmounts (and resumes if React mounts it again, as Strict Mode does).
 * - `props` are passed to the service on every render, so `prop()` and controlled context
 *   fields read them at once; the machine's `watch` actions run after the commit.
 * - `platform` is read once: give a stable object, such as a module-level constant whose
 *   actions read what they need from their params.
 *
 * Returns the service: hand it to the component's `connect`.
 *
 * @example
 * const service = useMachine(clipboardMachine, props, domPlatform);
 * const api = connect(service);
 */
export function useMachine<S extends MachineSchema>(
  machine: Machine<S>,
  props: S['input'],
  platform: Platform<S>,
): Service<S> {
  const [service] = useState(() => createService(machine, { props, platform }));
  // Only stores the props: no actions run and no subscriber is called during render.
  service.setProps(props);
  useSyncExternalStore(service.subscribe, service.getSnapshot, service.getSnapshot);

  useLayoutEffect(() => {
    service.syncProps();
  });

  useEffect(() => {
    service.start();
    return () => {
      service.stop();
    };
  }, [service]);

  return service;
}
