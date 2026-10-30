import { vars } from '@contour-ui/tokens';
import type { ReactElement } from 'react';
import { afterEach } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';

import { Button, Drawer, Link, Portal } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

const SECTIONS = ['Guide', 'Essentials', 'Audio', 'Headless', 'Fumadocs'] as const;

/** The navigation of the docs, as a phone shows it: the menu button and the drawer it opens. */
function Navigation(props: Drawer.RootProps): ReactElement {
  return (
    <Drawer.Root {...props}>
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

/** The x, which takes the focus as the drawer opens. */
const close = () => page.getByRole('button', { name: 'Close', exact: true });

afterEach(() => {
  document.documentElement.removeAttribute('dir');
});

visualStates({
  start: {
    // Open from the start rather than with a click on Menu: focus that moves in after a click
    // shows no ring, and the state shows the x with one.
    render: () => <Navigation defaultOpen />,
    target: 'page',
    focused: close,
  },
  end: {
    render: () => <Navigation defaultOpen placement="end" />,
    target: 'page',
    focused: close,
  },
  top: {
    render: () => <Navigation defaultOpen placement="top" />,
    target: 'page',
    focused: close,
  },
  bottom: {
    render: () => <Navigation defaultOpen placement="bottom" />,
    target: 'page',
    focused: close,
  },
  size: {
    render: () => <Navigation defaultOpen size="md" />,
    target: 'page',
    focused: close,
  },
  'right-to-left': {
    render: () => {
      // A right-to-left page: the drawer renders under <body>, which takes the direction of <html>.
      document.documentElement.setAttribute('dir', 'rtl');
      return (
        <div dir="rtl">
          <Navigation defaultOpen />
        </div>
      );
    },
    target: 'page',
    focused: close,
  },
});
