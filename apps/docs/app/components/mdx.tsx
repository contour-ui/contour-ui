import { AudioPlaceholder } from '@contour-ui/audio';
import { Placeholder as HeadlessPlaceholder } from '@contour-ui/headless';
import { Kbd, Placeholder } from '@contour-ui/kit';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

import { Callout } from './callout.tsx';
import { Card, Cards } from './cards.tsx';
import { MdxLink } from './mdx-link.tsx';
import { mdxTableComponents } from './mdx-table.tsx';
import { Preview } from './preview.tsx';

/** What still comes from Fumadocs: code blocks and code tabs, headings with anchors, images. */
const {
  pre,
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
 * MDX components: Markdown links and tables drawn by Kit, the components every page can use
 * without an import, and live contour-ui components rendered from package sources.
 */
export function getMdxComponents(components?: MDXComponents): MDXComponents {
  return {
    pre,
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
    KitPlaceholder: Placeholder.Root,
    AudioPlaceholder: AudioPlaceholder.Root,
    HeadlessPlaceholder: HeadlessPlaceholder.Root,
    ...components,
  };
}
