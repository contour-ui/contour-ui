import { vars } from '@contour-ui/tokens';
import type { ReactElement, ReactNode } from 'react';
import { page, userEvent } from 'vite-plus/test/browser';

import { Card } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

const VARIANTS = [
  ['outline', 'Outline'],
  ['subtle', 'Subtle'],
  ['elevated', 'Elevated'],
] as const;

const SIZES = ['sm', 'md', 'lg'] as const;

/** Three columns, so a single card is as wide as one column of the variant grid. */
function Columns({ children }: { readonly children: ReactNode }): ReactElement {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        alignItems: 'start',
        gap: vars.space['section-gap'],
      }}
    >
      {children}
    </div>
  );
}

visualStates({
  // Every variant (rows) in every size (columns): the size sets the padding and the gap between
  // parts.
  variants: {
    render: () => (
      <Columns>
        {VARIANTS.flatMap(([variant, label]) =>
          SIZES.map((size) => (
            <Card.Root key={`${variant}-${size}`} variant={variant} size={size}>
              <Card.Header>
                <Card.Title>{label}</Card.Title>
                <Card.Description>{`Size ${size}`}</Card.Description>
              </Card.Header>
              <Card.Body>Padding and gaps follow the size.</Card.Body>
            </Card.Root>
          )),
        )}
      </Columns>
    ),
  },
  // A link as the root: the whole card is one link, focused with Tab, so it shows the focus ring.
  'as-link': {
    render: () => (
      <Columns>
        <Card.Root asChild>
          {/* The link text is in the title and the description, where lint does not look. */}
          {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
          <a href="/docs/essentials">
            <Card.Body>
              <Card.Title>Essentials</Card.Title>
              <Card.Description>The everyday components.</Card.Description>
            </Card.Body>
          </a>
        </Card.Root>
      </Columns>
    ),
    ready: () => userEvent.tab(),
    focused: () => page.getByRole('link', { name: /^Essentials\b/u }),
  },
  // Header, body and footer; the footer lays out its items in a row.
  parts: {
    render: () => (
      <Columns>
        <Card.Root>
          <Card.Header>
            <Card.Title>Live set</Card.Title>
            <Card.Description>Recorded on 12 October.</Card.Description>
          </Card.Header>
          <Card.Body>Two stereo stems and a click track.</Card.Body>
          <Card.Footer>
            <span>12 tracks</span>
            <span>48 kHz</span>
            <span>4:32</span>
          </Card.Footer>
        </Card.Root>
      </Columns>
    ),
  },
});
