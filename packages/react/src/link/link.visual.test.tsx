import { vars } from '@contour-ui/tokens';
import type { ComponentProps, ReactElement } from 'react';

import { Link } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

/** A router's link: takes `to` instead of `href` and passes the rest on to `<a>`. */
function RouterLink({
  to,
  children,
  ...props
}: ComponentProps<'a'> & { readonly to: string }): ReactElement {
  return (
    <a href={to} {...props}>
      {children}
    </a>
  );
}

visualStates({
  default: {
    render: () => <Link href="#">Read the guide</Link>,
  },
  variants: {
    render: () => (
      <div style={{ display: 'flex', gap: vars.space['section-gap'] }}>
        <Link href="#">Plain</Link>
        <Link variant="underline" href="#">
          Underline
        </Link>
        <Link variant="neutral" href="#">
          Neutral
        </Link>
      </div>
    ),
  },
  // In a list of navigation links, such as a site header, an index or a footer, links are
  // `neutral`: the list, not the color, tells them from text.
  navigation: {
    render: () => (
      <nav aria-label="Site">
        <ul
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: vars.space['section-gap'],
            margin: 0,
            padding: 0,
            listStyle: 'none',
          }}
        >
          {['Docs', 'Essentials', 'Audio', 'Tokens'].map((label) => (
            <li key={label}>
              <Link variant="neutral" href="#">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    ),
  },
  // In running text, links are underlined, so they do not stand out by color alone.
  'in-text': {
    render: () => (
      <div style={{ display: 'grid', gap: vars.space['section-gap'], maxInlineSize: '36rem' }}>
        <p style={{ margin: 0 }}>
          Read the{' '}
          <Link variant="underline" href="#">
            installation guide
          </Link>{' '}
          first: it lists the stylesheets to load and their order.
        </p>
        <p
          style={{
            margin: 0,
            font: vars.text.prose.font,
            letterSpacing: vars.text.prose.letterSpacing,
          }}
        >
          A link takes the font of the text around it, as in this paragraph, which uses the{' '}
          <Link variant="underline" href="#">
            prose text style
          </Link>
          .
        </p>
      </div>
    ),
  },
  // `asChild` renders a router's link with the Link class and attributes.
  'as-child': {
    render: () => (
      <Link asChild variant="underline">
        <RouterLink to="/docs/guide">Guide</RouterLink>
      </Link>
    ),
  },
});
