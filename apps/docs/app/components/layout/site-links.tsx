import { githubIcon } from '@contour-ui/icons';
import { IconButton } from '@contour-ui/kit';
import type { ReactElement } from 'react';
import { Link as RouterLink } from 'react-router';

import { GITHUB_URL, SITE_NAME } from '../../lib/site.ts';

/** The name of the site as a link to the home page (`site-links.css`), at the start of the header and the sidebar. */
export function Brand(): ReactElement {
  return (
    <RouterLink to="/" className="docs-brand">
      {SITE_NAME}
    </RouterLink>
  );
}

/** The repository on GitHub, as an icon button that opens it in a new tab. */
export function GitHubLink(): ReactElement {
  return (
    <IconButton
      asChild
      variant="ghost"
      size="lg"
      label="GitHub (opens in a new tab)"
      icon={githubIcon}
    >
      {/* oxlint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label -- IconButton gives the link its label and icon. */}
      <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener" />
    </IconButton>
  );
}
