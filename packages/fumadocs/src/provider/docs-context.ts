'use client';

import type { IconData } from '@contour-ui/icons';
import { createContext, use } from 'react';
import type { Context, ReactNode } from 'react';

/** A link of the site shown as an icon button, such as its repository. */
export interface DocsLink {
  /**
   * The name of the link, its accessible name (`GitHub`). A link to another site adds that it
   * opens in a new tab.
   */
  readonly label: string;
  /**
   * Where it leads: another site (a URL with a scheme) opens in a new tab, a path of this site
   * goes through the framework's `Link`.
   */
  readonly href: string;
  /** The icon: one of the `<camelName>Icon` exports of `@contour-ui/icons` (`githubIcon`). */
  readonly icon: IconData;
}

/** A text link of the site's header, such as the way into the docs. */
export interface DocsNavLink {
  /** The text of the link. */
  readonly label: string;
  /** Where it leads, through the framework's `Link`. */
  readonly href: string;
}

/** The site the layouts belong to: its name and its links, in the headers and the sidebar. */
export interface DocsSite {
  /** The name of the site: the brand, a link home at the start of the headers and the sidebar. */
  readonly name: ReactNode;
  /**
   * Where the brand leads.
   *
   * @defaultValue '/'
   */
  readonly url?: string | undefined;
  /** Text links next to the brand in the header of `HomeLayout`, such as `Docs`. */
  readonly nav?: readonly DocsNavLink[] | undefined;
  /**
   * Icon links, such as the repository on GitHub: in the header of `HomeLayout`, and at the foot
   * of the sidebar and of the menu of `DocsLayout`.
   */
  readonly links?: readonly DocsLink[] | undefined;
}

/** What `DocsProvider` gives the layouts. */
export interface DocsContextValue {
  readonly site: DocsSite;
  /** Collapse or expand the sidebar, and remember the choice under the provider's key. */
  readonly setSidebarCollapsed: (collapsed: boolean) => void;
}

/** The site and the settings of the nearest `DocsProvider`. */
export const DocsContext: Context<DocsContextValue | null> = createContext<DocsContextValue | null>(
  null,
);

/** The site and the settings of the nearest `DocsProvider`; throws outside of one. */
export function useDocsContext(): DocsContextValue {
  const docs = use(DocsContext);
  if (docs === null) {
    throw new Error('@contour-ui/fumadocs: render the layouts inside <DocsProvider>.');
  }
  return docs;
}
