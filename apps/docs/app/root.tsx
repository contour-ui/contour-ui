import { RootProvider } from 'fumadocs-ui/provider/react-router';
import type { ReactElement, ReactNode } from 'react';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import { SearchDialog } from './components/search.tsx';
import { NotFound } from './routes/not-found.tsx';

import './app.css';
import '@contour-ui/tokens/tokens.css';
import '@contour-ui/tokens/fonts.css';
import '@contour-ui/kit/styles.css';
import '@contour-ui/audio/styles.css';

export function Layout({ children }: { readonly children: ReactNode }): ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="flex min-h-screen flex-col">
        {/* `class` drives Fumadocs' `.dark`; `data-theme` drives the contour-ui tokens. */}
        <RootProvider search={{ SearchDialog }} theme={{ attribute: ['class', 'data-theme'] }}>
          {children}
        </RootProvider>
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
    <main className="mx-auto w-full max-w-350 p-4 pt-16">
      <h1>Error</h1>
      <p>{error instanceof Error ? error.message : 'An unexpected error occurred.'}</p>
    </main>
  );
}
