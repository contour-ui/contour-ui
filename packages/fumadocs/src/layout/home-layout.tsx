import type { ReactElement, ReactNode } from 'react';

import { Header } from './header.tsx';
import { SkipLink } from './skip-link.tsx';

export interface HomeLayoutProps {
  /** The content of the page, in `main#content`. */
  readonly children: ReactNode;
}

/**
 * The layout of the pages outside the docs, such as the home page and the 404 page
 * (`home-layout.css`), inside `DocsProvider`: the skip link, the site header, then the content in
 * `main#content`, which fills the rest of the viewport. The header holds the brand, the text
 * links of the site (`site.nav`), the search, the theme toggle and the icon links of the site.
 *
 * @example
 * <HomeLayout>
 *   <h1>My site</h1>
 * </HomeLayout>
 */
export function HomeLayout({ children }: HomeLayoutProps): ReactElement {
  return (
    <div className="contour-docs-home-layout">
      <SkipLink />
      <Header variant="site" />
      <main id="content" tabIndex={-1} className="contour-docs-home-layout__main">
        {children}
      </main>
    </div>
  );
}
