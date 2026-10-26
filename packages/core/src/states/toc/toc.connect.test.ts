import { describe, expect, it } from 'vite-plus/test';

import { createService, createTestPlatform } from '../../machine/index.ts';
import type { MachineParams } from '../../machine/index.ts';
import { connect } from './toc.connect.ts';
import { tocMachine } from './toc.machine.ts';
import type { TocItem, TocSchema } from './toc.types.ts';

const items: readonly TocItem[] = [
  { value: 'intro', depth: 2 },
  { value: 'install', depth: 2 },
  { value: 'npm', depth: 3 },
  { value: 'usage', depth: 2 },
];

describe('toc connect', () => {
  it('reads the items and the active headings, and the first and last active item', () => {
    const test = createTestPlatform(tocMachine);
    const service = createService(tocMachine, { props: { items }, platform: test.platform });
    service.start();

    const before = connect(service);
    expect(before.items).toBe(items);
    expect(before.activeIds).toStrictEqual([]);
    expect(before.activeItems).toStrictEqual([]);
    expect(before.getItemState({ value: 'intro', depth: 2 })).toStrictEqual({
      active: false,
      first: false,
      last: false,
      depth: 2,
    });

    service.send({
      type: 'VISIBILITY.CHANGE',
      headings: [
        { value: 'usage', position: 'inside' },
        { value: 'install', position: 'inside' },
        { value: 'npm', position: 'inside' },
      ],
    });
    const api = connect(service);
    expect(api.activeIds).toStrictEqual(['install', 'npm', 'usage']);
    expect(api.activeItems).toStrictEqual(items.slice(1));
    expect(items.map((item) => api.getItemState(item))).toStrictEqual([
      { active: false, first: false, last: false, depth: 2 },
      { active: true, first: true, last: false, depth: 2 },
      { active: true, first: false, last: false, depth: 3 },
      { active: true, first: false, last: true, depth: 2 },
    ]);
    // An API holds the values of the moment it was made: connect again after a change.
    expect(before.activeIds).toStrictEqual([]);
  });

  it('takes first and last in the order of the items, whatever the order of the ids', () => {
    const test = createTestPlatform(tocMachine);
    const service = createService(tocMachine, {
      props: { items, activeIds: ['usage', 'unknown', 'intro'] },
      platform: test.platform,
    });
    service.start();

    const api = connect(service);
    expect(api.activeIds).toStrictEqual(['usage', 'unknown', 'intro']);
    expect(api.activeItems).toStrictEqual([items[0], items[3]]);
    expect(api.getItemState({ value: 'intro', depth: 2 })).toMatchObject({ first: true });
    expect(api.getItemState({ value: 'usage', depth: 2 })).toMatchObject({ last: true });
  });

  it('sends the events that set the active headings and scroll to a heading', () => {
    const scrolled: Array<MachineParams<TocSchema>['event']> = [];
    const test = createTestPlatform(tocMachine, {
      actions: {
        scrollToHeading: ({ event }) => {
          scrolled.push(event);
        },
      },
    });
    const service = createService(tocMachine, { props: { items }, platform: test.platform });
    service.start();
    const api = connect(service);

    api.setActiveIds(['npm']);
    expect(connect(service).activeIds).toStrictEqual(['npm']);

    api.scrollTo('usage');
    api.scrollTo('intro', { behavior: 'instant' });
    expect(scrolled).toStrictEqual([
      { type: 'SCROLL_TO', value: 'usage', behavior: undefined },
      { type: 'SCROLL_TO', value: 'intro', behavior: 'instant' },
    ]);
  });
});
