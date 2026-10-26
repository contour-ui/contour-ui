import type { Root } from 'fumadocs-core/page-tree';
import type { ReactElement, ReactNode } from 'react';

import { findSection, getSections } from '../../lib/sections.ts';
import { Header } from './header.tsx';
import type { DocsNavigation } from './navigation.ts';
import { Sidebar } from './sidebar.tsx';

export interface DocsShellProps {
  /** The page tree of the site, as the loader gives it. */
  readonly tree: Root;
  /** The URL of the page, as in the tree (`/docs/kit/button`). */
  readonly url: string;
  /** The page, a `DocsPage`. */
  readonly children: ReactNode;
}

/**
 * The layout of the docs pages (`docs-shell.css`): the navigation of the page's section, in the
 * sidebar from 48rem and in the menu of the header below, next to the page. Its root sets the
 * heights of the sticky bars for the components inside: `--docs-header-height` and
 * `--docs-toc-bar-height`.
 */
export function DocsShell({ tree, url, children }: DocsShellProps): ReactElement {
  const sections = getSections(tree);
  const navigation: DocsNavigation = { tree, sections, section: findSection(sections, url), url };

  return (
    <div className="docs-shell">
      <Header variant="docs" navigation={navigation} />
      <Sidebar navigation={navigation} />
      <div className="docs-shell__main">{children}</div>
    </div>
  );
}
