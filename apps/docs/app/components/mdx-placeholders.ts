import { Placeholder as HeadlessPlaceholder } from '@contour-ui/headless-react';
import { Placeholder } from '@contour-ui/kit';
import type { MDXComponents } from 'mdx/types';

/** The placeholder of each package, which every page can use without an import. */
export const mdxPlaceholderComponents = {
  KitPlaceholder: Placeholder.Root,
  HeadlessPlaceholder: HeadlessPlaceholder.Root,
} satisfies MDXComponents;
