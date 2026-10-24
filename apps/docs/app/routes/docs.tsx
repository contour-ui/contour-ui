import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { use } from 'react';
import type { ReactElement } from 'react';
import { useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { getMdxComponents } from '../components/mdx.tsx';
import { baseOptions } from '../lib/layout.shared.tsx';
import { docs, source } from '../lib/source.ts';

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
    pageTree: await source.serializePageTree(source.getPageTree()),
  };
}

function Content({ path }: { readonly path: string }): ReactElement {
  const page = docs.getPage(path);
  if (page === undefined) {
    throw new Error(`Unknown page: ${path}`);
  }
  const { toc } = use(page.load());
  const Mdx = page.body;

  return (
    <DocsPage toc={toc}>
      <title>{page.title}</title>
      <meta name="description" content={page.description} />
      <DocsTitle>{page.title}</DocsTitle>
      <DocsDescription>{page.description}</DocsDescription>
      <DocsBody>
        <Mdx components={getMdxComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export default function Page(): ReactElement {
  const { path, pageTree } = useFumadocsLoader(useLoaderData<typeof loader>());

  return (
    <DocsLayout {...baseOptions()} tree={pageTree}>
      <Content path={path} />
    </DocsLayout>
  );
}
