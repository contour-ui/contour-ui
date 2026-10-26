import { arrowUpRightIcon } from '@contour-ui/icons';
import { Icon, Link } from '@contour-ui/kit';
import type { ComponentProps, ReactElement } from 'react';
import { Link as RouterLink } from 'react-router';

import { isExternalHref } from '../lib/href.ts';

/**
 * A Markdown link as Kit's `Link`, underlined as links in running text are. A `#fragment` stays a
 * plain link, a page of this site goes through the router, and another site opens in a new tab,
 * with an arrow whose label joins the link's name.
 */
export function MdxLink({ href, children, ...props }: ComponentProps<'a'>): ReactElement {
  if (href === undefined || href.startsWith('#')) {
    return (
      <Link {...props} variant="underline" href={href}>
        {children}
      </Link>
    );
  }
  if (isExternalHref(href)) {
    return (
      <Link {...props} variant="underline" href={href} target="_blank" rel="noreferrer noopener">
        {children}
        <Icon icon={arrowUpRightIcon} label="opens in a new tab" />
      </Link>
    );
  }
  return (
    <Link {...props} asChild variant="underline">
      <RouterLink to={href}>{children}</RouterLink>
    </Link>
  );
}
