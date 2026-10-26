import { describe, expect, it, vi } from 'vite-plus/test';

import { createService, createTestPlatform, transition } from '../../machine/index.ts';
import type {
  MachineParams,
  MachineReadParams,
  Service,
  TestPlatformOverrides,
  TransitionResult,
} from '../../machine/index.ts';
import { tocMachine } from './toc.machine.ts';
import type {
  TocActiveChangeDetails,
  TocEvent,
  TocHeadingPosition,
  TocInput,
  TocItem,
  TocProps,
  TocSchema,
} from './toc.types.ts';

/** The headings of a page: an introduction, two sections with a subsection, and the API. */
const items: readonly TocItem[] = [
  { value: 'intro', depth: 2 },
  { value: 'install', depth: 2 },
  { value: 'npm', depth: 3 },
  { value: 'usage', depth: 2 },
  { value: 'api', depth: 2 },
];

/** A started table of contents on the test platform. */
function toc(props: Partial<TocInput> = {}, overrides?: TestPlatformOverrides<TocSchema>) {
  const test = createTestPlatform(tocMachine, overrides);
  const service = createService(tocMachine, {
    props: { items, ...props },
    platform: test.platform,
  });
  service.start();
  return { service, test };
}

/** Report where headings are, as the platform does. */
function report(
  service: Service<TocSchema>,
  positions: Readonly<Record<string, TocHeadingPosition>>,
): void {
  service.send({
    type: 'VISIBILITY.CHANGE',
    headings: Object.entries(positions).map(([value, position]) => ({ value, position })),
  });
}

/** The positions of every heading of `items`: inside and above the area as listed, else below. */
function readingAt(
  inside: readonly string[],
  above: readonly string[] = [],
): Record<string, TocHeadingPosition> {
  return Object.fromEntries(
    items.map(({ value }) => {
      if (inside.includes(value)) {
        return [value, 'inside'];
      }
      return [value, above.includes(value) ? 'above' : 'below'];
    }),
  );
}

/** An event the types reject, as a plain JavaScript caller could send it. */
function unknownEvent(type: string): TocEvent {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return { type } as TocEvent;
}

const activeSpy = () => vi.fn<(details: TocActiveChangeDetails) => void>();

/** The command that runs an action, as a pure transition returns it. */
const run = (action: string) => ({ type: 'run', action }) as const;

const activeIdsOf = (service: Service<TocSchema>): readonly string[] =>
  service.context.get('activeIds');

describe('toc machine', () => {
  it('starts observing the headings, with none active and the default observed area', () => {
    const { service, test } = toc();

    expect(service.matches('observing')).toBe(true);
    expect(activeIdsOf(service)).toStrictEqual([]);
    expect(service.prop('rootMargin')).toBe('-20px 0px -40% 0px');
    expect(service.prop('threshold')).toBe(0);
    expect(test.log).toStrictEqual(['start observeHeadings']);
  });

  it('makes the headings inside the observed area active, in the order of the items', () => {
    const { service } = toc();

    // Reported out of order: the items set the order.
    report(service, { usage: 'inside', install: 'inside', intro: 'above', npm: 'inside' });
    expect(activeIdsOf(service)).toStrictEqual(['install', 'npm', 'usage']);
  });

  it('follows the headings as they scroll through the observed area', () => {
    const onActiveChange = activeSpy();
    const { service } = toc({ onActiveChange });

    // The first report covers every heading.
    report(service, readingAt(['intro']));
    expect(activeIdsOf(service)).toStrictEqual(['intro']);

    // Later reports cover only the headings that moved.
    report(service, { install: 'inside' });
    expect(activeIdsOf(service)).toStrictEqual(['intro', 'install']);
    report(service, { intro: 'above' });
    expect(activeIdsOf(service)).toStrictEqual(['install']);
    report(service, { install: 'above' });
    expect(activeIdsOf(service)).toStrictEqual(['install']);
    report(service, { npm: 'inside' });
    expect(activeIdsOf(service)).toStrictEqual(['npm']);

    expect(onActiveChange.mock.calls.map(([details]) => details.activeIds)).toStrictEqual([
      ['intro'],
      ['intro', 'install'],
      ['install'],
      ['npm'],
    ]);
  });

  it('keeps the last heading scrolled past active while no heading is in the area', () => {
    const { service } = toc();

    report(service, readingAt([], ['intro', 'install', 'npm']));
    expect(activeIdsOf(service)).toStrictEqual(['npm']);

    // Back up into the section of the introduction, past `install`.
    report(service, { install: 'below', npm: 'below' });
    expect(activeIdsOf(service)).toStrictEqual(['intro']);
  });

  it('activates no heading while every heading is below the area', () => {
    const onActiveChange = activeSpy();
    const { service } = toc({ onActiveChange });

    // A long introduction before the first heading.
    report(service, readingAt([]));
    expect(activeIdsOf(service)).toStrictEqual([]);
    expect(onActiveChange).not.toHaveBeenCalled();

    // Scrolled down to the first heading, and back up.
    report(service, { intro: 'inside' });
    report(service, { intro: 'below' });
    expect(activeIdsOf(service)).toStrictEqual([]);
    expect(onActiveChange.mock.calls).toStrictEqual([
      [{ activeIds: ['intro'], activeItems: [{ value: 'intro', depth: 2 }] }],
      [{ activeIds: [], activeItems: [] }],
    ]);
  });

  it('follows a jump past several headings, which the platform reports as moved', () => {
    const { service } = toc();
    report(service, readingAt(['intro']));

    // From the introduction to the middle of `usage`, in one jump.
    report(service, { intro: 'above', install: 'above', npm: 'above', usage: 'above' });
    expect(activeIdsOf(service)).toStrictEqual(['usage']);

    // And back to the top.
    report(service, { intro: 'inside', install: 'below', npm: 'below', usage: 'below' });
    expect(activeIdsOf(service)).toStrictEqual(['intro']);
  });

  it('reports a change of the active headings once, with their items', () => {
    const onActiveChange = activeSpy();
    const { service } = toc({ onActiveChange });

    report(service, readingAt(['install', 'npm'], ['intro']));
    expect(onActiveChange.mock.calls).toStrictEqual([
      [
        {
          activeIds: ['install', 'npm'],
          activeItems: [
            { value: 'install', depth: 2 },
            { value: 'npm', depth: 3 },
          ],
        },
      ],
    ]);

    // Moves that leave the same headings active report nothing.
    report(service, { api: 'below', intro: 'above' });
    expect(onActiveChange).toHaveBeenCalledOnce();
  });

  it('ignores headings that are not items, and lists an id given twice once', () => {
    const twice: readonly TocItem[] = [...items, { value: 'npm', depth: 3 }];
    const { service } = toc({ items: twice });

    report(service, { unknown: 'inside' });
    expect(activeIdsOf(service)).toStrictEqual([]);
    expect(service.context.get('positions').has('unknown')).toBe(false);

    report(service, { npm: 'inside' });
    expect(activeIdsOf(service)).toStrictEqual(['npm']);
  });

  it('starts from defaultActiveIds, until the platform reports', () => {
    const onActiveChange = activeSpy();
    const { service } = toc({ defaultActiveIds: ['usage'], onActiveChange });

    expect(activeIdsOf(service)).toStrictEqual(['usage']);
    report(service, readingAt(['intro']));
    expect(activeIdsOf(service)).toStrictEqual(['intro']);
    expect(onActiveChange.mock.calls).toStrictEqual([
      [{ activeIds: ['intro'], activeItems: [{ value: 'intro', depth: 2 }] }],
    ]);
  });

  it('only reports new active headings while activeIds is controlled', () => {
    const onActiveChange = activeSpy();
    const props = { activeIds: ['intro'], onActiveChange };
    const { service } = toc(props);

    report(service, readingAt(['install'], ['intro']));
    expect(activeIdsOf(service)).toStrictEqual(['intro']);
    expect(onActiveChange.mock.calls.map(([details]) => details.activeIds)).toStrictEqual([
      ['install'],
    ]);

    // The owner passes the ids back; a report that keeps them reports nothing.
    service.setProps({ items, ...props, activeIds: ['install'] });
    expect(activeIdsOf(service)).toStrictEqual(['install']);
    report(service, { api: 'below' });
    expect(onActiveChange).toHaveBeenCalledOnce();
  });

  it('sets the active headings until the next visibility change', () => {
    const onActiveChange = activeSpy();
    const { service } = toc({ onActiveChange });
    report(service, readingAt(['intro']));

    service.send({ type: 'ACTIVE_IDS.SET', activeIds: ['usage', 'api'] });
    expect(activeIdsOf(service)).toStrictEqual(['usage', 'api']);
    // The same ids again: dropped.
    service.send({ type: 'ACTIVE_IDS.SET', activeIds: ['usage', 'api'] });

    report(service, { install: 'inside' });
    expect(activeIdsOf(service)).toStrictEqual(['intro', 'install']);
    expect(onActiveChange.mock.calls.map(([details]) => details.activeIds)).toStrictEqual([
      ['intro'],
      ['usage', 'api'],
      ['intro', 'install'],
    ]);
  });

  it('only reports the ids set while activeIds is controlled', () => {
    const onActiveChange = activeSpy();
    const { service } = toc({ activeIds: [], onActiveChange });

    service.send({ type: 'ACTIVE_IDS.SET', activeIds: ['api'] });
    expect(activeIdsOf(service)).toStrictEqual([]);
    expect(onActiveChange.mock.calls).toStrictEqual([
      [{ activeIds: ['api'], activeItems: [{ value: 'api', depth: 2 }] }],
    ]);
  });

  it('asks the platform to scroll to a heading', () => {
    const scrolled: Array<MachineParams<TocSchema>['event']> = [];
    const { service, test } = toc(
      { scrollBehavior: 'instant' },
      {
        actions: {
          scrollToHeading: ({ event }) => {
            scrolled.push(event);
          },
        },
      },
    );

    service.send({ type: 'SCROLL_TO', value: 'usage' });
    service.send({ type: 'SCROLL_TO', value: 'api', behavior: 'smooth' });
    expect(test.log).toStrictEqual([
      'start observeHeadings',
      'run scrollToHeading',
      'run scrollToHeading',
    ]);
    // The platform reads `behavior`, or else the prop.
    expect(scrolled).toStrictEqual([
      { type: 'SCROLL_TO', value: 'usage' },
      { type: 'SCROLL_TO', value: 'api', behavior: 'smooth' },
    ]);
    expect(service.prop('scrollBehavior')).toBe('instant');
    // Scrolling changes nothing by itself: the platform reports where the headings end up.
    expect(activeIdsOf(service)).toStrictEqual([]);
  });

  it('handles positions that the effect reports as soon as it starts', () => {
    const { service } = toc(
      {},
      {
        effects: {
          observeHeadings: ({ send }) => {
            send({
              type: 'VISIBILITY.CHANGE',
              headings: [{ value: 'install', position: 'inside' }],
            });
            return undefined;
          },
        },
      },
    );

    expect(activeIdsOf(service)).toStrictEqual(['install']);
  });

  it('observes again when the items change, and forgets the headings that are gone', () => {
    const onActiveChange = activeSpy();
    const props = { onActiveChange };
    const { service, test } = toc(props);
    report(service, readingAt(['usage'], ['intro', 'install', 'npm']));

    // The same array: nothing to observe again.
    service.setProps({ items, ...props });
    service.syncProps();
    expect(test.log).toStrictEqual(['start observeHeadings']);

    // Another page that keeps `install`: its known position stays, the rest is gone.
    const next: readonly TocItem[] = [
      { value: 'install', depth: 2 },
      { value: 'faq', depth: 2 },
    ];
    service.setProps({ items: next, ...props });
    service.syncProps();
    expect(test.log).toStrictEqual([
      'start observeHeadings',
      'stop observeHeadings',
      'start observeHeadings',
    ]);
    expect([...service.context.get('positions')]).toStrictEqual([['install', 'above']]);
    expect(activeIdsOf(service)).toStrictEqual(['install']);

    // A page without headings: none is active.
    service.setProps({ items: [], ...props });
    service.syncProps();
    expect(activeIdsOf(service)).toStrictEqual([]);
    expect(onActiveChange.mock.calls.map(([details]) => details.activeIds)).toStrictEqual([
      ['usage'],
      ['install'],
      [],
    ]);
  });

  it('keeps defaultActiveIds when the items change before the platform reports', () => {
    const { service, test } = toc({ defaultActiveIds: ['intro'] });

    service.setProps({ items: [...items], defaultActiveIds: ['intro'] });
    service.syncProps();
    expect(test.log).toStrictEqual([
      'start observeHeadings',
      'stop observeHeadings',
      'start observeHeadings',
    ]);
    expect(activeIdsOf(service)).toStrictEqual(['intro']);
  });

  it('observes again when the observed area changes, and not for other props', () => {
    const { service, test } = toc();

    service.setProps({ items, onActiveChange: () => {}, scrollBehavior: 'auto' });
    service.syncProps();
    expect(test.log).toStrictEqual(['start observeHeadings']);

    service.setProps({ items, rootMargin: '0px' });
    service.syncProps();
    service.setProps({ items, rootMargin: '0px', threshold: 0.5 });
    service.syncProps();
    expect(test.log).toStrictEqual([
      'start observeHeadings',
      'stop observeHeadings',
      'start observeHeadings',
      'stop observeHeadings',
      'start observeHeadings',
    ]);
  });

  it('stops observing when the service stops, and ignores unknown events', () => {
    const listener = vi.fn<() => void>();
    const { service, test } = toc();
    service.subscribe(listener);

    service.send(unknownEvent('SCROLL'));
    expect(listener).not.toHaveBeenCalled();

    service.stop();
    expect(test.log).toStrictEqual(['start observeHeadings', 'stop observeHeadings']);
    report(service, readingAt(['intro']));
    expect(activeIdsOf(service)).toStrictEqual([]);
  });

  it('decides every step as a pure transition', () => {
    const props: TocProps = { items, rootMargin: '0px', threshold: 0 };
    const context = { activeIds: [], positions: new Map<string, TocHeadingPosition>() };
    const step = (event: TocEvent): TransitionResult<TocSchema> => {
      const reads: MachineReadParams<TocSchema> = {
        prop: (key) => props[key],
        context: { get: (key) => context[key] },
        event,
      };
      return transition(tocMachine, 'observing', event, reads);
    };
    expect(step({ type: 'VISIBILITY.CHANGE', headings: [] })).toStrictEqual({
      taken: true,
      state: 'observing',
      commands: [run('applyVisibility')],
    });
    expect(step({ type: 'ACTIVE_IDS.SET', activeIds: ['api'] })).toStrictEqual({
      taken: true,
      state: 'observing',
      commands: [run('setActiveIds')],
    });
    expect(step({ type: 'SCROLL_TO', value: 'api' })).toStrictEqual({
      taken: true,
      state: 'observing',
      commands: [run('scrollToHeading')],
    });
    // Re-entered: the observation stops and starts again.
    expect(step({ type: 'OBSERVER.RESTART' })).toStrictEqual({
      taken: true,
      state: 'observing',
      commands: [
        { type: 'stop', effect: 'observeHeadings' },
        { type: 'start', effect: 'observeHeadings' },
      ],
    });
  });
});
