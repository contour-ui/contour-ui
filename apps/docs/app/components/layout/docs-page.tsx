import type { Root } from 'fumadocs-core/page-tree';
import type { TableOfContents } from 'fumadocs-core/toc';
import type { ReactElement, ReactNode } from 'react';

import { PageFooter } from '../page-footer.tsx';
import { PageHeader } from '../page-header.tsx';
import { TocPanel, TocPopover } from '../toc-panel.tsx';

export interface DocsPageProps {
  /** The title of the page, its heading. */
  readonly title: string;
  /** The description of the page, under its title. */
  readonly description?: string | undefined;
  /** The table of contents of the page, as Fumadocs gives it. */
  readonly toc: TableOfContents;
  /** The page tree of the site, for the links to the neighbors of the page. */
  readonly tree: Root;
  /** The URL of the page, as in the tree (`/docs/kit/button`). */
  readonly url: string;
  /** The content of the page: its MDX, in `Prose`. */
  readonly children: ReactNode;
}

/**
 * A docs page in the shell (`docs-page.css`): the bar of the table of contents, which sticks
 * below the header until 80rem, then the article in `main#content`, the target of the skip link,
 * as wide as a readable line, and from 80rem the column of the table of contents beside it. A
 * page without headings has neither. The article holds the header of the page, the content and
 * the links to the neighbor pages; the content fills the height of a short page, so the links
 * sit at the bottom.
 */
export function DocsPage({
  title,
  description,
  toc,
  tree,
  url,
  children,
}: DocsPageProps): ReactElement {
  const hasToc = toc.length > 0;

  return (
    <div className="docs-page">
      {hasToc ? (
        <div className="docs-page__toc-bar">
          <TocPopover toc={toc} />
        </div>
      ) : null}
      <div className="docs-page__body">
        <main id="content" tabIndex={-1} className="docs-page__article">
          <div className="docs-page__content">
            <PageHeader title={title} description={description} />
            {children}
          </div>
          <PageFooter tree={tree} url={url} />
        </main>
        {hasToc ? (
          <div className="docs-page__toc">
            <TocPanel toc={toc} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
