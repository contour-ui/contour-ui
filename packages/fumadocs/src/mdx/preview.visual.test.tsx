import { Button, Card, Link } from '@contour-ui/react';
import { vars } from '@contour-ui/tokens';
import type { ReactElement, ReactNode } from 'react';

import { mdx } from '../test-utils/mdx.tsx';
import { visualStates } from '../test-utils/visual.tsx';
import { Preview, Prose } from './index.ts';

/** In the content of a page, as an MDX page renders it. */
function InContent({ children }: { readonly children: ReactNode }): ReactElement {
  return <Prose style={{ maxInlineSize: '44rem' }}>{children}</Prose>;
}

const H2 = mdx('h2');

/**
 * The frame of a live example. Prose leaves its content alone (`contour-docs-not-prose`): the
 * heading and the list inside keep the styles of the browser and of their components, unlike
 * the ones of the page around it.
 */
function LiveExample(): ReactElement {
  return (
    <>
      <p>The buttons below are live components, rendered from the package sources.</p>
      <Preview>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: vars.space['control-gap'] }}>
          <Button>Solid</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </Preview>
      <H2 id="cards">Cards</H2>
      <Preview>
        <Card.Root>
          <Card.Body>
            <Card.Title>Plugin preset</Card.Title>
            <Card.Description>
              A styled card, with a <Link href="#cards">link</Link> in its text.
            </Card.Description>
          </Card.Body>
        </Card.Root>
      </Preview>
    </>
  );
}

visualStates({
  'live-example': {
    render: () => (
      <InContent>
        <LiveExample />
      </InContent>
    ),
  },
});
