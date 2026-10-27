'use client';

import type { Root } from 'fumadocs-core/page-tree';
import type { ReactElement, ReactNode } from 'react';

import { DocsTreeContext } from './docs-tree-context.ts';
import { Header } from './header.tsx';
import type { DocsNavigation } from './navigation.ts';
import { usePageUrl } from './use-page-url.ts';
import { findSection, getSections } from './sections.ts';
import { Sidebar } from './sidebar.tsx';
import { SkipLink } from './skip-link.tsx';

export interface DocsLayoutProps {
  /** The page tree of the site, as fumadocs-core's `loader()` gives it (`source.getPageTree()`). */
  readonly tree: Root;
  /** The page, a `DocsPage`. */
  readonly children: ReactNode;
}

/**
 * The layout of the docs pages (`docs-layout.css`), inside `DocsProvider`: the skip link, then
 * the navigation of the page's section next to the page, in the sidebar from 48rem and in the
 * menu of the header below. The sections are the root folders of the tree (`"root": true` in
 * their `meta.json`): the section switcher goes from one to another, and the page tree lists the
 * pages of the current one, the section of the framework's pathname. Its root sets the heights
 * of the sticky bars for the components inside: `--contour-docs-header-height` and
 * `--contour-docs-toc-bar-height`.
 *
 * @example
 * <DocsLayout tree={source.getPageTree()}>
 *   <DocsPage title={page.data.title} toc={page.data.toc}>…</DocsPage>
 * </DocsLayout>
 */
export function DocsLayout({ tree, children }: DocsLayoutProps): ReactElement {
  const url = usePageUrl();
  const sections = getSections(tree);
  const navigation: DocsNavigation = { tree, sections, section: findSection(sections, url), url };

  return (
    <DocsTreeContext value={tree}>
      <div className="contour-docs-layout">
        <SkipLink />
        <Header variant="docs" navigation={navigation} />
        <Sidebar navigation={navigation} />
        <div className="contour-docs-layout__main">{children}</div>
      </div>
    </DocsTreeContext>
  );
}
