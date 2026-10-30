import { vars } from '@contour-ui/tokens';
import type { ReactElement } from 'react';
import { page } from 'vite-plus/test/browser';

import { Button, Drawer, Link, Portal } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

const SECTIONS = ['Guide', 'Essentials', 'Audio', 'Headless', 'Fumadocs'] as const;

/** The navigation of the docs, as a phone shows it, open from the start. */
function Navigation(): ReactElement {
  return (
    <Drawer.Root defaultOpen>
      <Drawer.Trigger asChild>
        <Button variant="outline">Menu</Button>
      </Drawer.Trigger>
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Title>contour-ui</Drawer.Title>
              <Drawer.Description>Components for plugins and pages.</Drawer.Description>
            </Drawer.Header>
            <Drawer.Body>
              <nav aria-label="Sections" style={{ display: 'grid', gap: vars.space['group-gap'] }}>
                {SECTIONS.map((section) => (
                  <Link key={section} href={`#${section.toLowerCase()}`}>
                    {section}
                  </Link>
                ))}
              </nav>
            </Drawer.Body>
            <Drawer.Footer>
              <Drawer.CloseTrigger asChild>
                <Button variant="outline">Done</Button>
              </Drawer.CloseTrigger>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}

visualStates({
  start: {
    render: () => <Navigation />,
    target: 'page',
    // Focus moves to the x as the overlay opens.
    focused: () => page.getByRole('button', { name: 'Close', exact: true }),
  },
});
