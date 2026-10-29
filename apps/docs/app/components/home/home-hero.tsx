import { Button, CodeBlock } from '@contour-ui/kit';
import type { ReactElement } from 'react';
import { Link as RouterLink } from 'react-router';

/** The command of the install box. */
const INSTALL = 'pnpm add @contour-ui/audio';

/** What the hero says contour-ui is: also the description of the page. */
export const HOME_DESCRIPTION =
  'Plugins, DAWs, web audio tools. Tokens, headless logic and components, from a button to a spectrum analyzer.';

/**
 * The hero of the home page (`home.css`): the title on the left; the description, the way into
 * the guide and the install command on the right, both columns as high as each other.
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
          <CodeBlock.Root
            value={INSTALL}
            aria-label="Install command"
            className="docs-home__install"
          >
            <CodeBlock.CopyTrigger label="Copy install command" />
            <CodeBlock.Content>
              <pre>
                <code>
                  <span className="docs-home__prompt">$ </span>
                  {INSTALL}
                </code>
              </pre>
            </CodeBlock.Content>
          </CodeBlock.Root>
        </div>
      </div>
    </section>
  );
}
