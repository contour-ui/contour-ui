import { AudioPlaceholder } from '@contour-ui/audio';
import { Placeholder as HeadlessPlaceholder } from '@contour-ui/headless';
import { Placeholder } from '@contour-ui/kit';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

import { Cards } from './cards.tsx';
import { Preview } from './preview.tsx';

/** MDX components, including live contour-ui components rendered from package sources. */
export function getMdxComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Preview,
    Cards,
    KitPlaceholder: Placeholder.Root,
    AudioPlaceholder: AudioPlaceholder.Root,
    HeadlessPlaceholder: HeadlessPlaceholder.Root,
    ...components,
  };
}
