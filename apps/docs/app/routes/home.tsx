import { Button, Card } from '@contour-ui/kit';
import type { ReactElement } from 'react';
import { Link as RouterLink } from 'react-router';

import { SiteLayout } from '../components/layout/site-layout.tsx';
import { SITE_DESCRIPTION, SITE_NAME } from '../lib/site.ts';

/** The shipped packages; each has its own docs section. */
const PACKAGES = [
  { title: 'Kit', href: '/docs/kit', description: 'Styled general-purpose components.' },
  {
    title: 'Audio',
    href: '/docs/audio',
    description: 'Styled controls for audio-plugin UIs, built on Kit.',
  },
  {
    title: 'Headless',
    href: '/docs/headless',
    description: 'Unstyled components for your own look.',
  },
] as const;

export function meta(): Array<Record<string, string>> {
  return [{ title: SITE_NAME }, { name: 'description', content: SITE_DESCRIPTION }];
}

/** The home page (`home.css`): what contour-ui is, the way into the guide, and a card per package. */
export default function Home(): ReactElement {
  return (
    <SiteLayout>
      <div className="docs-home">
        <div className="docs-home__hero">
          <h1 className="docs-home__title">{SITE_NAME}</h1>
          <p className="docs-home__description">{SITE_DESCRIPTION}</p>
          <Button asChild size="lg">
            <RouterLink to="/docs/guide">How it works</RouterLink>
          </Button>
        </div>
        <ul className="docs-home__packages">
          {PACKAGES.map(({ title, href, description }) => (
            <li key={href}>
              <Card.Root asChild size="lg">
                <RouterLink to={href}>
                  <Card.Body>
                    <Card.Title asChild>
                      <h2>{title}</h2>
                    </Card.Title>
                    <Card.Description>{description}</Card.Description>
                  </Card.Body>
                </RouterLink>
              </Card.Root>
            </li>
          ))}
        </ul>
      </div>
    </SiteLayout>
  );
}
