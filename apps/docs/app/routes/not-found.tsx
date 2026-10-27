import { HomeLayout } from '@contour-ui/fumadocs';
import { Link } from '@contour-ui/kit';
import type { ReactElement, ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';

export interface PageMessageProps {
  /** The heading of the page. */
  readonly title: string;
  /** A sentence or two under it, and a link onwards. */
  readonly children?: ReactNode;
}

/**
 * A short message in the middle of the page (`not-found.css`), such as "Not found", with a link
 * onwards: the content of the 404 page and of the root error boundary.
 */
export function PageMessage({ title, children }: PageMessageProps): ReactElement {
  return (
    <div className="docs-page-message">
      <h1 className="docs-page-message__title">{title}</h1>
      {children}
    </div>
  );
}

/**
 * The 404 page, for paths outside the routes and for docs pages that do not exist (the root
 * `ErrorBoundary` renders it), so it sets its own title.
 */
export function NotFound(): ReactElement {
  return (
    <HomeLayout>
      <title>Not found</title>
      <PageMessage title="Not found">
        <p>There is no page at this address.</p>
        <Link asChild>
          <RouterLink to="/docs">Back to docs</RouterLink>
        </Link>
      </PageMessage>
    </HomeLayout>
  );
}

export default NotFound;
