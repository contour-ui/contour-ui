import { Kbd, Table } from '@contour-ui/kit';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vite-plus/test';

import { Callout } from './callout.tsx';
import { Card, Cards } from './cards.tsx';
import { getMdxComponents } from './get-mdx-components.tsx';
import { MdxLink } from './link.tsx';
import { MdxPre } from './pre.tsx';
import { Preview } from './preview.tsx';
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
  Tab,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './tabs/index.ts';

function Steps(): ReactElement {
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
        'Tabs',
        'Tab',
        'TabsList',
        'TabsTrigger',
        'TabsContent',
        'CodeBlockTabs',
        'CodeBlockTabsList',
        'CodeBlockTabsTrigger',
        'CodeBlockTab',
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
    // What `remarkCodeTab` and `remarkNpm` write into a page, and the parts of `Tabs`.
    expect(components['Tabs']).toBe(Tabs);
    expect(components['Tab']).toBe(Tab);
    expect(components['TabsList']).toBe(TabsList);
    expect(components['TabsTrigger']).toBe(TabsTrigger);
    expect(components['TabsContent']).toBe(TabsContent);
    expect(components['CodeBlockTabs']).toBe(CodeBlockTabs);
    expect(components['CodeBlockTabsList']).toBe(CodeBlockTabsList);
    expect(components['CodeBlockTabsTrigger']).toBe(CodeBlockTabsTrigger);
    expect(components['CodeBlockTab']).toBe(CodeBlockTab);
  });

  it('returns the same components on every call', () => {
    const [first, second] = [getMdxComponents(), getMdxComponents({ Steps })];

    // A new component each time would remount the content of a page that builds the map as it
    // renders.
    const changed = Object.keys(first).filter((name) => second[name] !== first[name]);
    expect(changed).toStrictEqual([]);
  });

  it("adds the app's components and lets them replace the defaults", () => {
    const components = getMdxComponents({ Steps, Tabs: Steps, a: Anchor });

    expect(components['Steps']).toBe(Steps);
    expect(components['Tabs']).toBe(Steps);
    expect(components['a']).toBe(Anchor);
    expect(components['pre']).toBe(MdxPre);
  });
});
