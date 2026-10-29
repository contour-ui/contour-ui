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

import { ContourLogo } from './components/contour-logo.tsx';
import { NotFound, PageMessage } from './routes/not-found.tsx';

// The stylesheet of @contour-ui/fumadocs before Kit's: its first rule is the order of every
// cascade layer of contour-ui. The app's own CSS comes last.
import '@contour-ui/tokens/tokens.css';
import '@contour-ui/tokens/fonts.css';
import '@contour-ui/fumadocs/styles.css';
import '@contour-ui/kit/styles.css';
import '@contour-ui/audio/styles.css';
import './app.css';

/** The site: the logo in the headers and the sidebar, the ways into the docs, the repository. */
const SITE: DocsSite = {
  name: <ContourLogo />,
  nav: [
    { label: 'Docs', href: '/docs' },
    { label: 'Kit', href: '/docs/kit' },
    { label: 'Audio', href: '/docs/audio' },
  ],
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
        {/* The mark, dark or light with the color scheme; a dark tile where SVG icons are not read. */}
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="icon" href="/icon-32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/app-icon-180.png" />
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
