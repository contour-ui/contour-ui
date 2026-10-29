import { Kbd, Table } from '@contour-ui/kit';
import type { MDXComponents } from 'mdx/types';

import { Callout } from './callout.tsx';
import { Card, Cards } from './cards.tsx';
import { MdxHeading } from './heading.tsx';
import { MdxLink } from './link.tsx';
import { MdxPre } from './pre.tsx';
import { Preview } from './preview.tsx';
import { MdxTable } from './table.tsx';
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

/** Markdown headings, `#` to `######`, as {@link MdxHeading} of their level. */
const mdxHeadingComponents = {
  h1: (props) => <MdxHeading {...props} as="h1" />,
  h2: (props) => <MdxHeading {...props} as="h2" />,
  h3: (props) => <MdxHeading {...props} as="h3" />,
  h4: (props) => <MdxHeading {...props} as="h4" />,
  h5: (props) => <MdxHeading {...props} as="h5" />,
  h6: (props) => <MdxHeading {...props} as="h6" />,
} satisfies MDXComponents;

/**
 * MDX components: Markdown headings that link to themselves, links, tables and code blocks drawn
 * by Kit, the components every page can use without an import (`Callout`, `Card`, `Cards`,
 * `Kbd`, `Preview`, `Tabs` and `Tab`), and those that Fumadocs' remark plugins write into a page:
 * the code block tabs of the `tab` meta and of `npm` blocks (`CodeBlockTabs` and its parts), and
 * the parts of `Tabs`. `overrides` come last: the app's own components, or replacements for these.
 * Elements without an entry, such as images, render as they are, and `Prose` styles them.
 *
 * It works where MDX renders on the server (React Server Components): the components that need
 * the browser, here and in Kit, are client modules (`'use client'`), which the map holds as
 * references, so a page without tabs loads none of their code; Kit's namespaces such as `Table`
 * are server modules, so the map can read their parts.
 *
 * @example
 * <Prose>
 *   <Mdx components={getMdxComponents({ Steps })} />
 * </Prose>
 */
export function getMdxComponents(overrides?: MDXComponents): MDXComponents {
  return {
    ...mdxHeadingComponents,
    pre: MdxPre,
    a: MdxLink,
    table: MdxTable,
    // The other table elements are Kit's parts. Their props pass through, the inline `text-align`
    // of an aligned column included.
    thead: Table.Header,
    tbody: Table.Body,
    tr: Table.Row,
    th: Table.ColumnHeader,
    td: Table.Cell,
    Callout,
    Card,
    Cards,
    Kbd,
    Preview,
    Tabs,
    Tab,
    TabsList,
    TabsTrigger,
    TabsContent,
    CodeBlockTabs,
    CodeBlockTabsList,
    CodeBlockTabsTrigger,
    CodeBlockTab,
    ...overrides,
  };
}
