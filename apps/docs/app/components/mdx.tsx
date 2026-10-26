import { Kbd } from '@contour-ui/kit';
import type { MDXComponents } from 'mdx/types';

import { Callout } from './callout.tsx';
import { Card, Cards } from './cards.tsx';
import { mdxHeadingComponents } from './mdx-heading.tsx';
import { MdxLink } from './mdx-link.tsx';
import { mdxPlaceholderComponents } from './mdx-placeholders.ts';
import { MdxPre } from './mdx-pre.tsx';
import { mdxTableComponents } from './mdx-table.tsx';
import { Preview } from './preview.tsx';

/**
 * MDX components: Markdown headings that link to themselves, links, tables and code blocks drawn
 * by Kit, the components every page can use without an import, and live contour-ui components
 * rendered from package sources. Elements without an entry, such as images, render as they are,
 * and Prose styles them.
 */
export function getMdxComponents(components?: MDXComponents): MDXComponents {
  return {
    ...mdxHeadingComponents,
    pre: MdxPre,
    a: MdxLink,
    ...mdxTableComponents,
    Callout,
    Card,
    Cards,
    Kbd,
    Preview,
    ...mdxPlaceholderComponents,
    ...components,
  };
}
