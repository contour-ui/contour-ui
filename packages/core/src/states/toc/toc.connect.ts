import type { Service } from '../../machine/index.ts';
import { itemsOf } from './toc.machine.ts';
import type { TocApi, TocSchema } from './toc.types.ts';

/**
 * The state and actions of a running table of contents machine, as its parts need them: the
 * items, the active headings and the state of each item, and functions that send the events.
 * No DOM and no platform: an adapter turns the result into the props of its elements.
 *
 * Call it on every render: it reads the current snapshot.
 *
 * @example
 * const service = useMachine(tocMachine, props, platform);
 * const api = connect(service);
 * api.getItemState(item).active; // true while its heading is in the observed area
 * api.scrollTo('install');
 */
export function connect(service: Service<TocSchema>): TocApi {
  const items = service.prop('items');
  const activeIds = service.context.get('activeIds');
  const activeItems = itemsOf(items, activeIds);
  const first = activeItems[0]?.value;
  const last = activeItems.at(-1)?.value;
  const active = new Set(activeIds);
  return {
    items,
    activeIds,
    activeItems,
    getItemState: (item) => ({
      active: active.has(item.value),
      first: item.value === first,
      last: item.value === last,
      depth: item.depth,
    }),
    setActiveIds: (ids) => {
      service.send({ type: 'ACTIVE_IDS.SET', activeIds: ids });
    },
    scrollTo: (value, details) => {
      service.send({ type: 'SCROLL_TO', value, behavior: details?.behavior });
    },
  };
}
