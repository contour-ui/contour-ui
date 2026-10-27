import type { MDXComponents } from 'mdx/types';

import { Callout } from './callout.tsx';
import { Card, Cards } from './cards.tsx';
import { MdxHeading } from './heading.tsx';
import { Kbd } from './kbd.ts';
import { MdxLink } from './link.tsx';
import { MdxPre } from './pre.tsx';
import { Preview } from './preview.tsx';
import {
  MdxTable,
  MdxTableBody,
  MdxTableCell,
  MdxTableColumnHeader,
  MdxTableHeader,
  MdxTableRow,
} from './table.tsx';

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
 * by Kit, and the components every page can use without an import (`Callout`, `Card`, `Cards`,
 * `Kbd`, `Preview`). `overrides` come last: the app's own components, or replacements for these.
 * Elements without an entry, such as images, render as they are, and `Prose` styles them.
 *
 * It works where MDX renders on the server (React Server Components): this module imports nothing
 * from Kit, and the components that need the browser are client modules (`'use client'`), which
 * the map holds as references.
 *
 * @example
 * <Prose>
 *   <Mdx components={getMdxComponents({ Tabs })} />
 * </Prose>
 */
export function getMdxComponents(overrides?: MDXComponents): MDXComponents {
  return {
    ...mdxHeadingComponents,
    pre: MdxPre,
    a: MdxLink,
    table: MdxTable,
    thead: MdxTableHeader,
    tbody: MdxTableBody,
    tr: MdxTableRow,
    th: MdxTableColumnHeader,
    td: MdxTableCell,
    Callout,
    Card,
    Cards,
    Kbd,
    Preview,
    ...overrides,
  };
}
