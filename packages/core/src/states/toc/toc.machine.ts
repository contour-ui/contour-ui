import { createMachine } from '../../machine/index.ts';
import type { Machine } from '../../machine/index.ts';
import type { TocHeadingPosition, TocHeadingVisibility, TocItem, TocSchema } from './toc.types.ts';

/** The observed area when the `rootMargin` prop is not set: from 20px below the top to 60%. */
const DEFAULT_ROOT_MARGIN = '-20px 0px -40% 0px';

/** No active headings: one array for every empty value, so a default is never a change. */
const NO_IDS: readonly string[] = [];

/** No positions reported yet. */
const NO_POSITIONS: ReadonlyMap<string, TocHeadingPosition> = new Map();

type Positions = ReadonlyMap<string, TocHeadingPosition>;

/** Whether two lists hold the same ids in the same order. */
function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/** Whether two maps hold the same headings at the same positions. */
function samePositions(a: Positions, b: Positions): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const [value, position] of a) {
    if (b.get(value) !== position) {
      return false;
    }
  }
  return true;
}

/**
 * The items of these headings, in the order of `items`.
 *
 * @example
 * itemsOf([{ value: 'a', depth: 2 }, { value: 'b', depth: 2 }], ['b']); // [{ value: 'b', depth: 2 }]
 */
export function itemsOf(items: readonly TocItem[], ids: readonly string[]): TocItem[] {
  const wanted = new Set(ids);
  return items.filter((item) => wanted.has(item.value));
}

/**
 * The positions of the headings of `items`: the reported ones, and the previous ones for the
 * rest. Headings that are not items any more are dropped.
 */
function mergePositions(
  items: readonly TocItem[],
  previous: Positions,
  reported: readonly TocHeadingVisibility[],
): Positions {
  const reports = new Map(reported.map(({ value, position }) => [value, position]));
  const next = new Map<string, TocHeadingPosition>();
  for (const { value } of items) {
    const position = reports.get(value) ?? previous.get(value);
    if (position !== undefined) {
      next.set(value, position);
    }
  }
  return next;
}

/**
 * The active headings at these positions: the headings inside the observed area, in the order
 * of `items`. When none is, the last heading above it, whose section fills the area; none
 * while every heading is below it, as on an introduction before the first one.
 */
function activeIdsAt(items: readonly TocItem[], positions: Positions): readonly string[] {
  // A set keeps the order of `items` and drops an id listed twice.
  const inside = new Set<string>();
  for (const { value } of items) {
    if (positions.get(value) === 'inside') {
      inside.add(value);
    }
  }
  if (inside.size > 0) {
    return [...inside];
  }
  const above = items.findLast(({ value }) => positions.get(value) === 'above');
  return above === undefined ? NO_IDS : [above.value];
}

/**
 * The table of contents machine: which headings of the page are active, from where the platform
 * reports them to be. One state, `observing`, runs the platform effect `observeHeadings`.
 *
 * - `VISIBILITY.CHANGE` updates the positions of the reported headings (`above`, `inside` or
 *   `below` the observed area) and makes active the headings inside the area, in the order of
 *   `items`. When none is, the last heading above the area stays active: its section is the
 *   one being read. While every heading is below the area, none is active.
 * - `ACTIVE_IDS.SET` makes the given headings active, until the next visibility change.
 * - A change of the active ids is reported as `onActiveChange({ activeIds, activeItems })`,
 *   never the same ids twice. While `activeIds` is controlled, it is only reported.
 * - `SCROLL_TO` asks the platform to scroll to a heading (`scrollToHeading`).
 * - A new `items`, `rootMargin` or `threshold` restarts the observation. With new `items`, the
 *   positions of the headings that are gone are forgotten and the active ids follow, once the
 *   platform has reported anything at all: until then, `defaultActiveIds` stand. Pass the same
 *   `items` array while the headings stay the same.
 *
 * @example
 * const service = createService(tocMachine, { props: { items }, platform });
 * service.start();
 * service.send({
 *   type: 'VISIBILITY.CHANGE',
 *   headings: [{ value: 'install', position: 'inside' }],
 * });
 * service.context.get('activeIds'); // ['install']
 */
export const tocMachine: Machine<TocSchema> = createMachine<TocSchema>({
  props: ({ rootMargin = DEFAULT_ROOT_MARGIN, threshold = 0, ...input }) => ({
    ...input,
    rootMargin,
    threshold,
  }),
  context: {
    activeIds: ({ prop }) => ({
      value: prop('activeIds'),
      defaultValue: prop('defaultActiveIds') ?? NO_IDS,
      onChange: (activeIds) => {
        prop('onActiveChange')?.({ activeIds, activeItems: itemsOf(prop('items'), activeIds) });
      },
      isEqual: sameIds,
    }),
    positions: () => ({ defaultValue: NO_POSITIONS, isEqual: samePositions }),
  },
  initial: 'observing',
  on: {
    'ACTIVE_IDS.SET': { actions: ['setActiveIds'] },
    SCROLL_TO: { actions: ['scrollToHeading'] },
  },
  watch: {
    items: ['forgetRemovedHeadings', 'restartObserver'],
    rootMargin: ['restartObserver'],
    threshold: ['restartObserver'],
  },
  states: {
    observing: {
      effects: ['observeHeadings'],
      on: {
        'VISIBILITY.CHANGE': { actions: ['applyVisibility'] },
        // Re-entered: the effect stops and starts again with the current props.
        'OBSERVER.RESTART': { target: 'observing', reenter: true },
      },
    },
  },
  actions: {
    applyVisibility: ({ context, event, prop }) => {
      if (event.type !== 'VISIBILITY.CHANGE') {
        return;
      }
      const items = prop('items');
      const positions = mergePositions(items, context.get('positions'), event.headings);
      context.set('positions', positions);
      context.set('activeIds', activeIdsAt(items, positions));
    },
    forgetRemovedHeadings: ({ context, prop }) => {
      const previous = context.get('positions');
      // Nothing reported yet: the default active ids stand until the platform reports.
      if (previous.size === 0) {
        return;
      }
      const items = prop('items');
      const positions = mergePositions(items, previous, []);
      context.set('positions', positions);
      context.set('activeIds', activeIdsAt(items, positions));
    },
    setActiveIds: ({ context, event }) => {
      if (event.type === 'ACTIVE_IDS.SET') {
        context.set('activeIds', event.activeIds);
      }
    },
    restartObserver: ({ send }) => {
      send({ type: 'OBSERVER.RESTART' });
    },
  },
  guards: {},
  delays: {},
});
