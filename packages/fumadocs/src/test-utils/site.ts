import { githubIcon } from '@contour-ui/icons';

import type { DocsSite } from '../index.ts';

/** The site of the fixtures: its name, the way into the docs, and its repository. */
export const site: DocsSite = {
  name: 'contour-ui',
  nav: [{ label: 'Docs', href: '/docs' }],
  links: [{ label: 'GitHub', href: 'https://github.com/contour-ui/contour-ui', icon: githubIcon }],
};
