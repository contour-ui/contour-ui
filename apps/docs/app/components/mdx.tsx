import { Kbd } from '@contour-ui/kit';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

import { Callout } from './callout.tsx';
import { Card, Cards } from './cards.tsx';
import { MdxLink } from './mdx-link.tsx';
import { mdxPlaceholderComponents } from './mdx-placeholders.ts';
import { MdxPre } from './mdx-pre.tsx';
import { mdxTableComponents } from './mdx-table.tsx';
import { Preview } from './preview.tsx';

/** What still comes from Fumadocs: code tabs, headings with anchors, images. */
const {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  img,
} = defaultMdxComponents;

/**
 * MDX components: Markdown links, tables and code blocks drawn by Kit, the components every page
 * can use without an import, and live contour-ui components rendered from package sources.
 */
export function getMdxComponents(components?: MDXComponents): MDXComponents {
  return {
    pre: MdxPre,
    CodeBlockTab,
    CodeBlockTabs,
    CodeBlockTabsList,
    CodeBlockTabsTrigger,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    img,
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
