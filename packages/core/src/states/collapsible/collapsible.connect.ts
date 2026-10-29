import type { Service } from '../../machine/index.ts';
import type { CollapsibleApi, CollapsibleSchema } from './collapsible.types.ts';

/**
 * The state and actions of a running collapsible machine, as its parts need them: whether it is
 * open and disabled, and functions that send the requests. No DOM and no platform: an adapter
 * turns the result into the props of its elements.
 *
 * Call it on every render: it reads the current snapshot and props.
 *
 * @example
 * const service = useMachine(collapsibleMachine, props, platform);
 * const api = connect(service);
 * api.open; // false
 * api.toggle();
 */
export function connect(service: Service<CollapsibleSchema>): CollapsibleApi {
  return {
    open: service.matches('open'),
    disabled: service.prop('disabled'),
    setOpen: (open) => {
      service.send({ type: open ? 'OPEN' : 'CLOSE' });
    },
    toggle: () => {
      service.send({ type: 'TOGGLE' });
    },
  };
}
