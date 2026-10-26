import type { Service } from '../../machine/index.ts';
import type { ClipboardApi, ClipboardSchema } from './clipboard.types.ts';

/**
 * The state and actions of a running clipboard machine, as its parts need them: whether the
 * value was just copied, the value, and functions that send the events. No DOM and no
 * platform: an adapter turns the result into the props of its elements.
 *
 * Call it on every render: it reads the current snapshot.
 *
 * @example
 * const service = useMachine(clipboardMachine, props, platform);
 * const api = connect(service);
 * api.copied; // false
 * api.copy();
 */
export function connect(service: Service<ClipboardSchema>): ClipboardApi {
  return {
    copied: service.matches('copied'),
    value: service.context.get('value'),
    copy: () => {
      service.send({ type: 'COPY' });
    },
    setValue: (value) => {
      service.send({ type: 'VALUE.SET', value });
    },
  };
}
