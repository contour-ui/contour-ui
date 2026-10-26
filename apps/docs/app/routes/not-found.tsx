import { Link } from '@contour-ui/kit';
import type { ReactElement } from 'react';
import { Link as RouterLink } from 'react-router';

import { SiteLayout, SiteMessage } from '../components/layout/site-layout.tsx';

/**
 * The 404 page, for paths outside the routes and for docs pages that do not exist (the root
 * `ErrorBoundary` renders it), so it sets its own title.
 */
export function NotFound(): ReactElement {
  return (
    <SiteLayout>
      <title>Not found</title>
      <SiteMessage title="Not found">
        <p>There is no page at this address.</p>
        <Link asChild>
          <RouterLink to="/docs">Back to docs</RouterLink>
        </Link>
      </SiteMessage>
    </SiteLayout>
  );
}

export default NotFound;
