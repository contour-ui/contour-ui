import { Kbd, Table } from '@contour-ui/kit';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vite-plus/test';

import { Callout } from './callout.tsx';
import { Card, Cards } from './cards.tsx';
import { getMdxComponents } from './get-mdx-components.tsx';
import { MdxLink } from './link.tsx';
import { MdxPre } from './pre.tsx';
import { Preview } from './preview.tsx';

function Tabs(): ReactElement {
  return <div />;
}

function Anchor(): ReactElement {
  return <a href="#top">Top</a>;
}

describe('getMdxComponents', () => {
  it('maps Markdown elements and the components pages use without an import', () => {
    const components = getMdxComponents();

    expect(Object.keys(components).toSorted()).toStrictEqual(
      [
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'a',
        'pre',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td',
        'Callout',
        'Card',
        'Cards',
        'Kbd',
        'Preview',
      ].toSorted(),
    );
    expect(components['a']).toBe(MdxLink);
    expect(components['pre']).toBe(MdxPre);
    expect(components['Callout']).toBe(Callout);
    expect(components['Card']).toBe(Card);
    expect(components['Cards']).toBe(Cards);
    expect(components['Kbd']).toBe(Kbd);
    expect(components['Preview']).toBe(Preview);
    expect(components['thead']).toBe(Table.Header);
    expect(components['td']).toBe(Table.Cell);
  });

  it('returns the same components on every call', () => {
    const [first, second] = [getMdxComponents(), getMdxComponents({ Tabs })];

    // A new component each time would remount the content of a page that builds the map as it
    // renders.
    const changed = Object.keys(first).filter((name) => second[name] !== first[name]);
    expect(changed).toStrictEqual([]);
  });

  it("adds the app's components and lets them replace the defaults", () => {
    const components = getMdxComponents({ Tabs, a: Anchor });

    expect(components['Tabs']).toBe(Tabs);
    expect(components['a']).toBe(Anchor);
    expect(components['pre']).toBe(MdxPre);
  });
});
