import { Link } from '@contour-ui/kit';
import type { ReactElement } from 'react';
import { Link as RouterLink } from 'react-router';

import { SearchTrigger } from '../search/search-trigger.tsx';
import { ThemeToggle } from '../theme-toggle.tsx';
import { Brand, GitHubLink } from './site-links.tsx';
import { MobileNav } from './mobile-nav.tsx';
import type { DocsNavigation } from './navigation.ts';

export type HeaderProps =
  | {
      /** The header of the docs pages on narrow screens, with the menu of their navigation. */
      readonly variant: 'docs';
      readonly navigation: DocsNavigation;
    }
  | {
      /** The header of the other pages, at every width. */
      readonly variant: 'site';
    };

/**
 * The bar at the top of a page (`header.css`), `--docs-header-height` high, which sticks to the
 * top while the page scrolls. Both variants start with the brand.
 *
 * - `docs`: on the docs pages below 48rem, where the sidebar is gone: the search and the button
 *   of the menu, which holds the navigation.
 * - `site`: on the home page and the 404 page: a link to the docs, the search (a field from
 *   48rem, an icon below), the theme toggle and the GitHub link.
 */
export function Header(props: HeaderProps): ReactElement {
  if (props.variant === 'docs') {
    return (
      <header className="docs-header" data-variant="docs">
        <Brand />
        <div className="docs-header__actions">
          <SearchTrigger variant="icon" />
          <MobileNav navigation={props.navigation} />
        </div>
      </header>
    );
  }
  return (
    <header className="docs-header" data-variant="site">
      <Brand />
      <Link asChild className="docs-header__link">
        <RouterLink to="/docs">Docs</RouterLink>
      </Link>
      <div className="docs-header__actions">
        <SearchTrigger className="docs-header__search-field" />
        <SearchTrigger variant="icon" className="docs-header__search-icon" />
        <ThemeToggle />
        <GitHubLink />
      </div>
    </header>
  );
}
