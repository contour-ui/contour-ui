import { Button } from '@contour-ui/react';
import { vars } from '@contour-ui/tokens';
import { Link as FrameworkLink } from 'fumadocs-core/framework';
import type { CSSProperties, ReactElement } from 'react';

import { HomeLayout } from '../index.ts';
import { visualStates } from '../test-utils/visual.tsx';

/**
 * The column of the content, as the header lays out its own: `--contour-docs-home-width` wide,
 * centered, with at least the page inset at the sides. A page of the site does the same in its
 * CSS.
 */
const COLUMN: CSSProperties = {
  display: 'grid',
  justifyItems: 'start',
  gap: vars.space['group-gap'],
  boxSizing: 'border-box',
  inlineSize: '100%',
  maxInlineSize: 'calc(var(--contour-docs-home-width) + 2 * var(--contour-docs-page-inset))',
  marginInline: 'auto',
  paddingBlock: vars.space['section-gap'],
  paddingInline: 'var(--contour-docs-page-inset)',
};

/** The home page of the site: the header, with its search unless `search` is false, and a hero. */
function Home({ search = true }: { readonly search?: boolean }): ReactElement {
  return (
    <HomeLayout search={search}>
      <div style={COLUMN}>
        <h1 style={{ margin: 0 }}>contour-ui</h1>
        <p style={{ margin: 0 }}>Design system for audio-plugin UIs and general web UI.</p>
        <Button asChild size="lg">
          <FrameworkLink href="/docs/guide">Get started</FrameworkLink>
        </Button>
      </div>
    </HomeLayout>
  );
}

/** The page fills the viewport, edge to edge, at the address of the home page. */
const HOME = { params: { pathname: '/' }, padded: false } as const;

visualStates({
  // From 48rem: the header 4.5rem high, the search a field with its shortcut.
  desktop: { ...HOME, render: () => <Home /> },
  // `search={false}`: the header leaves the search out.
  'desktop-without-search': { ...HOME, render: () => <Home search={false} /> },
  // Below 48rem: the header 3rem high, the search an icon button.
  phone: { ...HOME, render: () => <Home />, phone: true },
  // `search={false}` on a phone: the three links of the site fit beside the brand and the buttons.
  'phone-without-search': { ...HOME, render: () => <Home search={false} />, phone: true },
  // The three-way theme picker in the header of a phone, next to the search and the icon links.
  'phone-light-dark-system-theme': {
    ...HOME,
    render: () => <Home />,
    params: { pathname: '/', themeToggle: 'light-dark-system' },
    phone: true,
  },
  // `--contour-docs-home-width: 48rem` from the app's CSS: the header and the column narrow.
  'custom-width': {
    ...HOME,
    render: () => (
      <>
        <style>{'.contour-docs-home-layout { --contour-docs-home-width: 48rem; }'}</style>
        <Home search={false} />
      </>
    ),
  },
});
