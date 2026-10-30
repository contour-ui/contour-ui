import { DocsLayout, DocsPage } from '@contour-ui/fumadocs';
import { getMdxComponents, Prose } from '@contour-ui/fumadocs/mdx';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { use } from 'react';
import type { ReactElement } from 'react';
import { isRouteErrorResponse, useLoaderData } from 'react-router';
import type { ClientLoaderFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { docs, source } from '../lib/source.ts';
import { NotFound } from './not-found.tsx';

export async function loader({ params }: LoaderFunctionArgs) {
  const slugs = (params['*'] ?? '').split('/').filter((segment) => segment.length > 0);
  const page = source.getPage(slugs);
  if (page === undefined) {
    // React Router signals HTTP errors by throwing a Response, not an Error.
    // oxlint-disable-next-line typescript/only-throw-error
    throw new Response('Not found', { status: 404 });
  }
  return {
    path: page.path,
    title: page.data.title,
    description: page.data.description,
    pageTree: await source.serializePageTree(source.getPageTree()),
  };
}

/**
 * The same data in the browser, from the prerendered `.data` file of the page. A static host
 * serves a path that was not prerendered, such as a page that does not exist, with the SPA
 * fallback, which hydrates with no data for this route: without a client loader, React Router
 * fails with "No result found"; through `serverLoader()`, it asks for the page's `.data` file,
 * the host answers 404, and the root error boundary shows the 404 page.
 */
export function clientLoader({ serverLoader }: ClientLoaderFunctionArgs) {
  return serverLoader<typeof loader>();
}

interface ContentProps {
  /** The path of the page's file, as the collection knows it (`essentials/button.mdx`). */
  readonly path: string;
  readonly title: string;
  readonly description: string | undefined;
}

/** The page itself, once its MDX and its table of contents have loaded. */
function Content({ path, title, description }: ContentProps): ReactElement {
  const page = docs.getPage(path);
  if (page === undefined) {
    throw new Error(`Unknown page: ${path}`);
  }
  const { toc } = use(page.load());
  const Mdx = page.body;

  return (
    <DocsPage title={title} description={description} toc={toc}>
      <Prose>
        <Mdx components={getMdxComponents()} />
      </Prose>
    </DocsPage>
  );
}

export default function Page(): ReactElement {
  const { path, title, description, pageTree } =
    useFumadocsLoader(useLoaderData<typeof clientLoader>());

  return (
    <>
      <title>{title}</title>
      {description === undefined ? null : <meta name="description" content={description} />}
      {/* The layout and the page find the page in the tree by the pathname. */}
      <DocsLayout tree={pageTree}>
        <Content path={path} title={title} description={description} />
      </DocsLayout>
    </>
  );
}

/**
 * A docs page that does not exist shows the 404 page in place of this route, so the root layout
 * stays mounted, as it does for a path outside the routes. Other errors go on to the root error
 * boundary.
 */
export function ErrorBoundary({ error }: { readonly error: unknown }): ReactElement {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound />;
  }
  throw error;
}
