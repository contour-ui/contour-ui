import type { ReactElement, ReactNode } from 'react';

import { Header } from './header.tsx';
import { SkipLink } from './skip-link.tsx';

export interface HomeLayoutProps {
  /** The content of the page, in `main#content`. */
  readonly children: ReactNode;
  /**
   * Whether the header holds the search button. `false` leaves it out, as on a home page whose
   * search lives in the docs; the shortcut (⌘K, Ctrl K) still opens the search of
   * `DocsProvider`.
   *
   * @defaultValue true
   */
  readonly search?: boolean | undefined;
}

/**
 * The layout of the pages outside the docs, such as the home page and the 404 page
 * (`home-layout.css`), inside `DocsProvider`: the skip link, the site header, then the content in
 * `main#content`, which fills the rest of the viewport. The header lays its content out in the
 * column of the page, `--contour-docs-home-width` wide: the brand at the start, then at the end
 * the text links of the site (`site.nav`), the search, the icon links of the site and the theme
 * toggle. The content spans the width of the page: its own columns read the same variables.
 *
 * @example
 * <HomeLayout search={false}>
 *   <h1>My site</h1>
 * </HomeLayout>
 */
export function HomeLayout({ children, search = true }: HomeLayoutProps): ReactElement {
  return (
    <div className="contour-docs-home-layout">
      <SkipLink />
      <Header variant="site" search={search} />
      <main id="content" tabIndex={-1} className="contour-docs-home-layout__main">
        {children}
      </main>
    </div>
  );
}
