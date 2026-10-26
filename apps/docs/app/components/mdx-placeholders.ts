import { AudioPlaceholder } from '@contour-ui/audio';
import { Placeholder as HeadlessPlaceholder } from '@contour-ui/headless';
import { Placeholder } from '@contour-ui/kit';
import type { MDXComponents } from 'mdx/types';

/** The placeholder of each package, which every page can use without an import. */
export const mdxPlaceholderComponents = {
  KitPlaceholder: Placeholder.Root,
  AudioPlaceholder: AudioPlaceholder.Root,
  HeadlessPlaceholder: HeadlessPlaceholder.Root,
} satisfies MDXComponents;
