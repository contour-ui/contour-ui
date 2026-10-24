import { AudioPlaceholder } from '@contour-ui/audio';
import { Placeholder as HeadlessPlaceholder } from '@contour-ui/headless';
import { Placeholder } from '@contour-ui/kit';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import type { ReactElement, ReactNode } from 'react';

/** Frame for a live example, outside the prose styles so components render with their own CSS. */
function Preview({ children }: { readonly children: ReactNode }): ReactElement {
  return (
    <div className="not-prose my-6 rounded-xl border border-fd-border bg-fd-background p-6">
      {children}
    </div>
  );
}

/** MDX components, including live contour-ui components rendered from package sources. */
export function getMdxComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Preview,
    KitPlaceholder: Placeholder.Root,
    AudioPlaceholder: AudioPlaceholder.Root,
    HeadlessPlaceholder: HeadlessPlaceholder.Root,
    ...components,
  };
}
