import { Link } from '@contour-ui/kit';
import type { ReactElement } from 'react';

/** The repository of contour-ui. */
const REPOSITORY = 'https://github.com/contour-ui/contour-ui';

/** The foot of the home page (`home.css`): the state of the project and its links. */
export function HomeFooter(): ReactElement {
  return (
    <footer className="docs-home__footer">
      <div className="docs-home__footer-content">
        <p className="docs-home__status">@contour-ui · in development, APIs may change</p>
        <Link href={REPOSITORY}>GitHub</Link>
      </div>
    </footer>
  );
}
