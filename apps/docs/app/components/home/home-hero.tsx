import { Button, Clipboard } from '@contour-ui/react';
import type { ReactElement } from 'react';
import { Link as RouterLink } from 'react-router';

/** The command of the install box. */
const INSTALL = 'pnpm add @contour-ui/react';

/** How long the check mark of the install box shows after a copy, in milliseconds. */
const COPIED_MS = 1500;

/** What the hero says contour-ui is: also the description of the page. */
export const HOME_DESCRIPTION =
  'Plugins, DAWs, web audio tools. Tokens, headless logic and components, from a button to a spectrum analyzer.';

/**
 * The hero of the home page (`home.css`): the title on the left; the description, the way into
 * the guide and the install command on the right, both columns as high as each other. The
 * install command is Kit's Clipboard, as high as the button beside it.
 */
export function HomeHero(): ReactElement {
  return (
    <section className="docs-home__hero">
      <h1 className="docs-home__title">A design system for audio interfaces</h1>
      <div className="docs-home__lead">
        <p className="docs-home__description">{HOME_DESCRIPTION}</p>
        <div className="docs-home__actions">
          <Button asChild size="lg">
            <RouterLink to="/docs/guide">Get started</RouterLink>
          </Button>
          <Clipboard.Root value={INSTALL} size="lg" timeout={COPIED_MS}>
            <Clipboard.Control>
              <Clipboard.ValueText prompt="$" />
              <Clipboard.Trigger aria-label="Copy the install command">
                <Clipboard.Indicator />
                Copy
              </Clipboard.Trigger>
            </Clipboard.Control>
          </Clipboard.Root>
        </div>
      </div>
    </section>
  );
}
