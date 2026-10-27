import { DocsProvider, docsScript, HomeLayout } from '@contour-ui/fumadocs';
import type { DocsSite } from '@contour-ui/fumadocs';
import { githubIcon } from '@contour-ui/icons';
import { ReactRouterProvider } from 'fumadocs-core/framework/react-router';
import type { ReactElement, ReactNode } from 'react';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import { NotFound, PageMessage } from './routes/not-found.tsx';

// The stylesheet of @contour-ui/fumadocs before Kit's: its first rule is the order of every
// cascade layer of contour-ui. The app's own CSS comes last.
import '@contour-ui/tokens/tokens.css';
import '@contour-ui/tokens/fonts.css';
import '@contour-ui/fumadocs/styles.css';
import '@contour-ui/kit/styles.css';
import '@contour-ui/audio/styles.css';
import './app.css';

/** The site: the brand in the headers and the sidebar, the way into the docs, the repository. */
const SITE: DocsSite = {
  name: 'contour-ui',
  nav: [{ label: 'Docs', href: '/docs' }],
  links: [{ label: 'GitHub', href: 'https://github.com/contour-ui/contour-ui', icon: githubIcon }],
};

export function Layout({ children }: { readonly children: ReactNode }): ReactElement {
  return (
    // The inline script sets `data-theme` and `data-contour-docs-sidebar` on `<html>` before
    // React hydrates it.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        {/* Before the stylesheets, so the first paint has the theme and the sidebar state. */}
        <script dangerouslySetInnerHTML={{ __html: docsScript() }} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <Meta />
        <Links />
      </head>
      <body>
        {/* The links, the pathname and the router of the layouts are React Router's. */}
        <ReactRouterProvider>
          <DocsProvider site={SITE}>{children}</DocsProvider>
        </ReactRouterProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App(): ReactElement {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { readonly error: unknown }): ReactElement {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound />;
  }
  return (
    <HomeLayout>
      <title>Error</title>
      <PageMessage title="Error">
        <p>{error instanceof Error ? error.message : 'An unexpected error occurred.'}</p>
      </PageMessage>
    </HomeLayout>
  );
}
