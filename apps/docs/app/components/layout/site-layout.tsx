import type { ReactElement, ReactNode } from 'react';

import { Header } from './header.tsx';

export interface SiteLayoutProps {
  /** The content of the page, in `main#content`. */
  readonly children: ReactNode;
}

/**
 * The layout of the pages outside the docs, the home page and the 404 page (`site-layout.css`):
 * the site header, then the content, which fills the rest of the viewport.
 */
export function SiteLayout({ children }: SiteLayoutProps): ReactElement {
  return (
    <div className="docs-site">
      <Header variant="site" />
      <main id="content" tabIndex={-1} className="docs-site__main">
        {children}
      </main>
    </div>
  );
}

export interface SiteMessageProps {
  /** The heading of the page. */
  readonly title: string;
  /** A sentence or two under it, and a link onwards. */
  readonly children?: ReactNode;
}

/** A short message in the middle of the page, such as "Not found", with a link onwards. */
export function SiteMessage({ title, children }: SiteMessageProps): ReactElement {
  return (
    <div className="docs-site__message">
      <h1 className="docs-site__title">{title}</h1>
      {children}
    </div>
  );
}
