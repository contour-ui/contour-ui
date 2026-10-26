import type { Service } from '../../machine/index.ts';
import type { DialogApi, DialogSchema } from './dialog.types.ts';

/**
 * The state and actions of a running dialog machine, as its parts need them: whether the
 * dialog is open, whether it is modal, its role, and functions that send the requests. No DOM
 * and no platform: an adapter turns the result into the props of its elements.
 *
 * Call it on every render: it reads the current snapshot and props.
 *
 * @example
 * const service = useMachine(dialogMachine, props, platform);
 * const api = connect(service);
 * api.open; // false
 * api.setOpen(true);
 */
export function connect(service: Service<DialogSchema>): DialogApi {
  return {
    open: service.matches('open'),
    modal: service.prop('modal'),
    role: service.prop('role'),
    setOpen: (open) => {
      service.send({ type: open ? 'OPEN' : 'CLOSE' });
    },
    toggle: () => {
      service.send({ type: 'TOGGLE' });
    },
  };
}
