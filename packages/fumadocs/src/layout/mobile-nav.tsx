'use client';

import { menuIcon } from '@contour-ui/icons';
import { Drawer, IconButton, Portal } from '@contour-ui/kit';
import { usePathname } from 'fumadocs-core/framework';
import { useEffect, useState } from 'react';
import type { MouseEvent, ReactElement } from 'react';

import { ThemeToggle } from '../theme/theme-toggle.tsx';
import type { DocsNavigation } from './navigation.ts';
import { PageTree } from './page-tree.tsx';
import { SectionSwitcher } from './section-switcher.tsx';
import { SiteLinks } from './site-links.tsx';

/** The viewport of the sidebar layout (`docs-layout.css`). */
const SIDEBAR_QUERY = '(min-width: 48rem)';

/**
 * Whether a click follows a link of the drawer itself in this tab, as a router takes it: a click
 * of the main button, without a modifier key, on a link without another target inside the
 * element that listens (`currentTarget`). One that opens the link elsewhere, such as a link of the
 * site to another site, leaves the page where it is. A link of an overlay opened from the drawer
 * and portalled out of it, the section switcher's popover, is not the drawer's.
 */
function followsLink(event: MouseEvent<HTMLElement>): boolean {
  const link =
    event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
  return (
    link !== null &&
    event.currentTarget.contains(link) &&
    (link.target === '' || link.target === '_self') &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export interface MobileNavProps {
  readonly navigation: DocsNavigation;
}

/**
 * The menu button of the header on narrow screens, and the drawer it opens from the start edge
 * (`mobile-nav.css`): the section switcher and the pages of the section, then the links of the
 * site and the theme toggle. The drawer is mounted while it shows. A link followed inside it
 * closes it, a link to the page itself included, and so does any other way to another page, and
 * a viewport that widens to the sidebar layout; Escape and the close button close it too, and
 * focus goes back to the menu button. A section chosen in the switcher closes the switcher's
 * popover, which gives the focus back to the switcher, and the drawer closes as the framework
 * shows the section, so the focus ends on the menu button there too.
 */
export function MobileNav({ navigation }: MobileNavProps): ReactElement {
  const pathname = usePathname();
  // The pathname the drawer was opened at: it stays open only there, so going to another page,
  // by a link or by the history, closes it without an effect.
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
      open={openedAt === pathname}
      onOpenChange={(details) => {
        setOpenedAt(details.open ? pathname : null);
      }}
    >
      <Drawer.Trigger asChild>
        <IconButton variant="ghost" size="lg" label="Open menu" icon={menuIcon} />
      </Drawer.Trigger>
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content
            // A link to the page itself keeps the pathname: the click closes the drawer. Clicks
            // in the section switcher's popover come here too, through React, and are left to
            // the pathname: closed together, the drawer would not give the focus back from the
            // popover, portalled out of it, and the focus would end on the body.
            onClick={(event) => {
              if (followsLink(event)) {
                setOpenedAt(null);
              }
            }}
          >
            <Drawer.CloseTrigger label="Close menu" />
            <Drawer.Header>
              <Drawer.Title>Menu</Drawer.Title>
            </Drawer.Header>
            <Drawer.Body>
              <SectionSwitcher sections={navigation.sections} current={navigation.section} />
              <PageTree root={navigation.section ?? navigation.tree} url={navigation.url} />
            </Drawer.Body>
            <Drawer.Footer className="contour-docs-mobile-nav__footer">
              <SiteLinks />
              <ThemeToggle />
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
