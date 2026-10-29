'use client';

import { Link } from '@contour-ui/kit';
import { Link as FrameworkLink } from 'fumadocs-core/framework';
import type { ReactElement } from 'react';

import { useDocsContext } from '../provider/docs-context.ts';
import { SearchTrigger } from '../search/search-trigger.tsx';
import { ThemeToggle } from '../theme/theme-toggle.tsx';
import { MobileNav } from './mobile-nav.tsx';
import type { DocsNavigation } from './navigation.ts';
import { Brand, SiteLinks } from './site-links.tsx';

export type HeaderProps =
  | {
      /** The header of the docs pages on narrow screens, with the menu of their navigation. */
      readonly variant: 'docs';
      readonly navigation: DocsNavigation;
    }
  | {
      /** The header of the other pages, at every width. */
      readonly variant: 'site';
      /** Whether it holds the search button. */
      readonly search: boolean;
    };

/**
 * The text links of the site (`site.nav`), the navigation "Main" of the page, as a list; nothing
 * for a site without them.
 */
function SiteNav(): ReactElement | null {
  const { site } = useDocsContext();
  if (site.nav === undefined || site.nav.length === 0) {
    return null;
  }
  return (
    <nav aria-label="Main" className="contour-docs-header__nav">
      <ul className="contour-docs-header__nav-list">
        {site.nav.map(({ label, href }) => (
          <li key={href}>
            <Link asChild variant="neutral" className="contour-docs-header__link">
              <FrameworkLink href={href}>{label}</FrameworkLink>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The bar at the top of a page (`header.css`), `--contour-docs-header-height` high, which sticks
 * to the top while the page scrolls. Both variants start with the brand and hold the rest at the
 * end.
 *
 * - `docs`: on the docs pages below 48rem, where the sidebar is gone: the search and the button
 *   of the menu, which holds the navigation.
 * - `site`: on the pages of `HomeLayout`, in the column of the page: the text links of the site,
 *   such as the docs, then the search (a field from 48rem, an icon below) unless `search` is
 *   off, the icon links of the site and the theme toggle.
 */
export function Header(props: HeaderProps): ReactElement {
  if (props.variant === 'docs') {
    return (
      <header className="contour-docs-header" data-variant="docs">
        <Brand />
        <div className="contour-docs-header__actions">
          <SearchTrigger variant="icon" />
          <MobileNav navigation={props.navigation} />
        </div>
      </header>
    );
  }
  return (
    <header className="contour-docs-header" data-variant="site">
      <Brand />
      <SiteNav />
      <div className="contour-docs-header__actions">
        {props.search ? (
          <>
            <SearchTrigger className="contour-docs-header__search-field" />
            <SearchTrigger variant="icon" className="contour-docs-header__search-icon" />
          </>
        ) : null}
        <SiteLinks />
        <ThemeToggle />
      </div>
    </header>
  );
}
