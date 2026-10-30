'use client';

import type { TableOfContents } from 'fumadocs-core/toc';
import type { ReactElement, ReactNode } from 'react';

import { useDocsTree } from '../layout/docs-tree-context.ts';
import { usePageUrl } from '../layout/use-page-url.ts';
import { TocPanel, TocPopover } from '../toc/toc-panel.tsx';
import { PageFooter } from './page-footer.tsx';
import { PageHeader } from './page-header.tsx';

export interface DocsPageProps {
  /** The title of the page, its `h1`. */
  readonly title: string;
  /** The description of the page, under its title. */
  readonly description?: string | undefined;
  /** The table of contents of the page, as fumadocs-core gives it (`page.data.toc`). */
  readonly toc: TableOfContents;
  /** The content of the page: its MDX, in `Prose` (`@contour-ui/fumadocs/mdx`). */
  readonly children: ReactNode;
}

/**
 * A docs page in `DocsLayout` (`docs-page.css`): the bar of the table of contents, which sticks
 * below the header until 80rem, then the article in `main#content`, the target of the skip link,
 * as wide as a readable line, and from 80rem the column of the table of contents beside it. A
 * page without headings has neither. The article holds the header of the page (its title as the
 * page's only `h1`, and its description), the content and the links to the previous and the next
 * page of its section, which it finds in the layout's page tree by the framework's pathname; the
 * content fills the height of a short page, so the links sit at the bottom.
 *
 * @example
 * <DocsPage title={page.data.title} description={page.data.description} toc={page.data.toc}>
 *   <Prose>
 *     <Mdx components={getMdxComponents()} />
 *   </Prose>
 * </DocsPage>
 */
export function DocsPage({ title, description, toc, children }: DocsPageProps): ReactElement {
  const tree = useDocsTree();
  const url = usePageUrl(tree);
  const hasToc = toc.length > 0;

  return (
    <div className="contour-docs-page">
      {hasToc ? (
        <div className="contour-docs-page__toc-bar">
          <TocPopover toc={toc} />
        </div>
      ) : null}
      <div className="contour-docs-page__body">
        <main id="content" tabIndex={-1} className="contour-docs-page__article">
          <div className="contour-docs-page__content">
            <PageHeader title={title} description={description} />
            {children}
          </div>
          <PageFooter tree={tree} url={url} />
        </main>
        {hasToc ? (
          <div className="contour-docs-page__toc">
            <TocPanel toc={toc} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
