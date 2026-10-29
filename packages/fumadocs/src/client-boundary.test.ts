/**
 * The package under React Server Components (Next.js App Router): see `describeClientBoundary` in
 * `@contour-ui/vite-config/client-boundary` for the rules. Here, on top of them, no module brings
 * a router of its own.
 */
import path from 'node:path';

import { describeClientBoundary } from '@contour-ui/vite-config/client-boundary';
import { describe, expect, it } from 'vite-plus/test';

const boundary = describeClientBoundary({
  packageDir: path.join(import.meta.dirname, '..'),
  // An app calls `docsScript()` in a root layout and `getMdxComponents()` where MDX renders.
  serverModules: ['provider/docs-script.ts', 'mdx/get-mdx-components.tsx'],
});

/** Any import of a router package, type-only ones included. */
const ROUTER_IMPORT = /\bfrom\s+'((?:@react-router\/|react-router)[^']*)'/gu;

describe('the routing of the package', () => {
  it('imports no router: links and navigation come from fumadocs-core/framework', () => {
    const routers = [...boundary.modules.values()].flatMap(({ file, source }) =>
      [...source.matchAll(ROUTER_IMPORT)].map(([, from]) => `${file}: imports ${from}`),
    );

    expect(routers).toEqual([]);
  });
});
