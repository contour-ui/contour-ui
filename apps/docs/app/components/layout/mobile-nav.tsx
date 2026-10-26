import { menuIcon } from '@contour-ui/icons';
import { Drawer, IconButton, Portal } from '@contour-ui/kit';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useLocation } from 'react-router';

import { ThemeToggle } from '../theme-toggle.tsx';
import { GitHubLink } from './site-links.tsx';
import type { DocsNavigation } from './navigation.ts';
import { PageTree } from './page-tree.tsx';
import { SectionSwitcher } from './section-switcher.tsx';

/** The viewport of the sidebar layout (`docs-shell.css`). */
const SIDEBAR_QUERY = '(min-width: 48rem)';

export interface MobileNavProps {
  readonly navigation: DocsNavigation;
}

/**
 * The menu button of the header on narrow screens, and the drawer it opens from the start edge
 * (`mobile-nav.css`): the section switcher and the pages of the section, then the GitHub link and
 * the theme toggle. The drawer is mounted while it shows, and it closes when the location
 * changes, a link to the page itself included, and when the viewport widens to the sidebar
 * layout; Escape and the close button close it too, and focus goes back to the menu button.
 */
export function MobileNav({ navigation }: MobileNavProps): ReactElement {
  const location = useLocation();
  // The key of the location the drawer was opened at: it stays open only there, so any
  // navigation closes it without an effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);

  // From 48rem the sidebar takes over and the header, with the menu button, goes.
  useEffect(() => {
    const wide = matchMedia(SIDEBAR_QUERY);
    const close = (): void => {
      if (wide.matches) {
        setOpenedAt(null);
      }
    };
    wide.addEventListener('change', close);
    return () => {
      wide.removeEventListener('change', close);
    };
  }, []);

  return (
    <Drawer.Root
      placement="start"
      size="sm"
      lazyMount
      unmountOnExit
      open={openedAt === location.key}
      onOpenChange={(details) => {
        setOpenedAt(details.open ? location.key : null);
      }}
    >
      <Drawer.Trigger asChild>
        <IconButton variant="ghost" size="lg" label="Open menu" icon={menuIcon} />
      </Drawer.Trigger>
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.CloseTrigger label="Close menu" />
            <Drawer.Header>
              <Drawer.Title>Menu</Drawer.Title>
            </Drawer.Header>
            <Drawer.Body>
              <SectionSwitcher sections={navigation.sections} current={navigation.section} />
              <PageTree root={navigation.section ?? navigation.tree} url={navigation.url} />
            </Drawer.Body>
            <Drawer.Footer className="docs-mobile-nav__footer">
              <GitHubLink />
              <ThemeToggle />
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
