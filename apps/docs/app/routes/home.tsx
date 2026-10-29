import { HomeLayout } from '@contour-ui/fumadocs';
import type { ReactElement } from 'react';

import { HomeFooter } from '../components/home/home-footer.tsx';
import { HOME_DESCRIPTION, HomeHero } from '../components/home/home-hero.tsx';
import { HomeIndex } from '../components/home/home-index.tsx';
import { HomeTracks } from '../components/home/home-tracks.tsx';

export function meta(): Array<Record<string, string>> {
  return [{ title: 'contour-ui' }, { name: 'description', content: HOME_DESCRIPTION }];
}

/**
 * The home page (`home.css`, `home-tracks.css`), built from Kit and the tokens only: the hero,
 * the sequencer of the parts of contour-ui, the docs index and the foot of the page.
 */
export default function Home(): ReactElement {
  return (
    <HomeLayout>
      <div className="docs-home">
        <HomeHero />
        <HomeTracks />
        <HomeIndex />
      </div>
      <HomeFooter />
    </HomeLayout>
  );
}
