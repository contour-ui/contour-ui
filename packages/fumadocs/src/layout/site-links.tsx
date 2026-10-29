'use client';

import { IconButton } from '@contour-ui/react';
import { Link as FrameworkLink } from 'fumadocs-core/framework';
import type { ReactElement } from 'react';

import { useDocsContext } from '../provider/docs-context.ts';
import type { DocsLink } from '../provider/docs-context.ts';
import { isExternalHref } from '../utils/href.ts';

/**
 * The name of the site as a link home (`site-links.css`), at the start of the header and the
 * sidebar.
 */
export function Brand(): ReactElement {
  const { site } = useDocsContext();
  return (
    <FrameworkLink href={site.url ?? '/'} className="contour-docs-brand">
      {site.name}
    </FrameworkLink>
  );
}

/**
 * A link of the site as an icon button: another site opens in a new tab, which its name says, a
 * path of this site goes through the framework.
 */
function SiteLink({ link }: { readonly link: DocsLink }): ReactElement {
  const { label, href, icon } = link;
  if (isExternalHref(href)) {
    return (
      <IconButton
        asChild
        variant="ghost"
        size="lg"
        label={`${label} (opens in a new tab)`}
        icon={icon}
      >
        {/* oxlint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label -- IconButton gives the link its label and icon. */}
        <a href={href} target="_blank" rel="noreferrer noopener" />
      </IconButton>
    );
  }
  return (
    <IconButton asChild variant="ghost" size="lg" label={label} icon={icon}>
      <FrameworkLink href={href} />
    </IconButton>
  );
}

/**
 * The icon links of the site (`site-links.css`), such as its repository, side by side; nothing
 * for a site without them.
 */
export function SiteLinks(): ReactElement | null {
  const { site } = useDocsContext();
  if (site.links === undefined || site.links.length === 0) {
    return null;
  }
  return (
    <div className="contour-docs-site-links">
      {site.links.map((link) => (
        <SiteLink key={link.href} link={link} />
      ))}
    </div>
  );
}
