import type { ReactNode } from 'react';
import { render } from 'vitest-browser-react';
import type { RenderResult } from 'vitest-browser-react';

import { DocsProvider } from '../index.ts';
import type { DocsProviderProps } from '../index.ts';
import { MemoryFramework } from './framework.tsx';
import type { MemoryFrameworkProps } from './framework.tsx';
import { site } from './site.ts';

export interface RenderDocsOptions
  extends
    Pick<MemoryFrameworkProps, 'pathname' | 'onNavigate'>,
    Partial<Omit<DocsProviderProps, 'children'>> {}

/**
 * Render `ui` as a part of a docs site: inside `MemoryFramework` (at `pathname`, `/docs` by
 * default, with `onNavigate` told of every navigation), and `DocsProvider` with the site of the
 * fixtures and the options given. The search is off unless `search` is given.
 *
 * @example
 * const onNavigate = vi.fn();
 * await renderDocs(<DocsLayout tree={pageTree}>…</DocsLayout>, {
 *   pathname: '/docs/essentials',
 *   onNavigate,
 * });
 */
export function renderDocs(
  ui: ReactNode,
  { pathname, onNavigate, search = false, ...provider }: RenderDocsOptions = {},
): Promise<RenderResult> {
  return render(
    <MemoryFramework pathname={pathname} onNavigate={onNavigate}>
      <DocsProvider site={site} search={search} {...provider}>
        {ui}
      </DocsProvider>
    </MemoryFramework>,
  );
}
