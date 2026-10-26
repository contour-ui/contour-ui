import { panelLeftIcon } from '@contour-ui/icons';
import { IconButton } from '@contour-ui/kit';
import { useRef } from 'react';
import type { ReactElement } from 'react';

import { SearchTrigger } from '../search/search-trigger.tsx';
import { ThemeToggle } from '../theme-toggle.tsx';
import type { DocsNavigation } from './navigation.ts';
import { PageTree } from './page-tree.tsx';
import { SectionSwitcher } from './section-switcher.tsx';
import { setSidebarCollapsed } from './sidebar-state.ts';
import { Brand, GitHubLink } from './site-links.tsx';

export interface SidebarProps {
  readonly navigation: DocsNavigation;
}

/**
 * The navigation of the docs on wide screens (`sidebar.css`), the banner of the page there, as
 * the header is below 48rem: a column that stays in view, with the brand and the button that
 * collapses it, the search, the section switcher, the pages of the section, which scroll on
 * their own, and the GitHub link and the theme toggle at the bottom.
 *
 * Collapsed, the column hides, and a small toolbar at the top start holds the button that expands
 * it and the search. The state lives on `<html>` (`sidebar-state.ts`), and focus moves to the
 * button that undoes the change, since the one pressed disappears.
 */
export function Sidebar({ navigation }: SidebarProps): ReactElement {
  const collapseRef = useRef<HTMLButtonElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);

  return (
    <header className="docs-sidebar">
      <div className="docs-sidebar__panel">
        <div className="docs-sidebar__header">
          <Brand />
          <IconButton
            ref={collapseRef}
            variant="ghost"
            size="lg"
            label="Collapse sidebar"
            icon={panelLeftIcon}
            onClick={() => {
              setSidebarCollapsed(true);
              expandRef.current?.focus();
            }}
          />
        </div>
        <SearchTrigger className="docs-sidebar__search" />
        <SectionSwitcher sections={navigation.sections} current={navigation.section} />
        <div className="docs-sidebar__body">
          <PageTree root={navigation.section ?? navigation.tree} url={navigation.url} />
        </div>
        <div className="docs-sidebar__footer">
          <GitHubLink />
          <ThemeToggle />
        </div>
      </div>
      <div className="docs-sidebar__toolbar">
        <IconButton
          ref={expandRef}
          variant="ghost"
          size="lg"
          label="Expand sidebar"
          icon={panelLeftIcon}
          onClick={() => {
            setSidebarCollapsed(false);
            collapseRef.current?.focus();
          }}
        />
        <SearchTrigger variant="icon" />
      </div>
    </header>
  );
}
