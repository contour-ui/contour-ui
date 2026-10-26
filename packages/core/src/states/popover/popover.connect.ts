import type { Service } from '../../machine/index.ts';
import type { PopoverApi, PopoverSchema } from './popover.types.ts';

/**
 * The state and actions of a running popover machine, as its parts need them: whether the
 * popover is open, modal and portalled, where its content sits, and functions that send the
 * requests. No DOM and no platform: an adapter turns the result into the props of its elements.
 *
 * Call it on every render: it reads the current snapshot and props.
 *
 * @example
 * const service = useMachine(popoverMachine, props, platform);
 * const api = connect(service);
 * api.open; // false
 * api.toggle();
 */
export function connect(service: Service<PopoverSchema>): PopoverApi {
  return {
    open: service.matches('open'),
    modal: service.prop('modal'),
    portalled: service.prop('portalled'),
    placement: service.context.get('placement'),
    setOpen: (open) => {
      service.send({ type: open ? 'OPEN' : 'CLOSE' });
    },
    toggle: () => {
      service.send({ type: 'TOGGLE' });
    },
  };
}
