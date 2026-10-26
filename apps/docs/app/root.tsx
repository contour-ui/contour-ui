import { ThemeProvider, themeScript } from '@contour-ui/kit';
import type { ReactElement, ReactNode } from 'react';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import { sidebarScript } from './components/layout/sidebar-state.ts';
import { SiteLayout, SiteMessage } from './components/layout/site-layout.tsx';
import { SkipLink } from './components/layout/skip-link.tsx';
import { SearchProvider } from './components/search/search-provider.tsx';
import { NotFound } from './routes/not-found.tsx';

import './app.css';
import '@contour-ui/tokens/tokens.css';
import '@contour-ui/tokens/fonts.css';
import '@contour-ui/kit/styles.css';
import '@contour-ui/audio/styles.css';

export function Layout({ children }: { readonly children: ReactNode }): ReactElement {
  return (
    // The inline scripts set `data-theme` and `data-sidebar` on `<html>` before React hydrates it.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        {/* Before the stylesheets, so the first paint has the theme and the sidebar state. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript() }} />
        <script dangerouslySetInnerHTML={{ __html: sidebarScript }} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider>
          <SearchProvider>
            <SkipLink />
            {children}
          </SearchProvider>
        </ThemeProvider>
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
    <SiteLayout>
      <title>Error</title>
      <SiteMessage title="Error">
        <p>{error instanceof Error ? error.message : 'An unexpected error occurred.'}</p>
      </SiteMessage>
    </SiteLayout>
  );
}
