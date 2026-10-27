'use client';

import { arrowUpRightIcon } from '@contour-ui/icons';
import { Icon, Link } from '@contour-ui/kit';
import { Link as FrameworkLink } from 'fumadocs-core/framework';
import type { ComponentProps, ReactElement } from 'react';

import { isExternalHref } from '../utils/href.ts';

/**
 * A Markdown link as Kit's `Link`, underlined as links in running text are. A `#fragment` stays a
 * plain link, a page of this site goes through the framework's link (`fumadocs-core/framework`),
 * and another site opens in a new tab, with an arrow whose label joins the link's name.
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
      <FrameworkLink href={href}>{children}</FrameworkLink>
    </Link>
  );
}
