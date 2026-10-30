import { Link } from '@contour-ui/react';
import type { ReactElement } from 'react';
import { Link as RouterLink } from 'react-router';

/** An entry of the docs index: a page of the site, or a part that is not documented yet. */
interface IndexEntry {
  readonly label: string;
  /** The page; none for a part that does not ship yet, which the index marks as planned. */
  readonly href?: string;
}

interface IndexColumn {
  readonly title: string;
  readonly subtitle: string;
  readonly entries: readonly IndexEntry[];
}

/**
 * The docs index of the home page: the way into the guide, Essentials, Audio and the foundations.
 */
const INDEX: readonly IndexColumn[] = [
  {
    title: 'Getting started',
    subtitle: 'Install, set up, first component',
    entries: [
      { label: 'Introduction', href: '/docs/guide' },
      { label: 'Installation', href: '/docs/guide/installation' },
      { label: 'Styled or headless?' },
      { label: 'Host automation' },
      { label: 'Theming', href: '/docs/guide/themes' },
    ],
  },
  {
    title: 'Essentials',
    subtitle: 'The everyday parts of any interface',
    entries: [
      { label: 'Button', href: '/docs/essentials/button' },
      { label: 'Switch' },
      { label: 'RadioGroup' },
      { label: 'Select' },
      { label: 'Tabs', href: '/docs/essentials/tabs' },
      { label: 'Menu' },
      { label: 'Tooltip' },
    ],
  },
  {
    title: 'Audio',
    subtitle: 'Controls and displays for sound',
    entries: [
      { label: 'Knob' },
      { label: 'Fader' },
      { label: 'NumberField' },
      { label: 'Meter' },
      { label: 'Spectrum' },
      { label: 'XY Pad' },
      { label: 'EQ curve' },
    ],
  },
  {
    title: 'Foundations',
    subtitle: 'Tokens, headless, icons',
    entries: [
      { label: 'Tokens', href: '/docs/guide/styling' },
      { label: 'Themes', href: '/docs/guide/themes' },
      { label: 'Icons', href: '/docs/essentials/icon' },
      { label: 'Headless', href: '/docs/headless' },
      { label: 'Soundor' },
    ],
  },
];

/**
 * The docs index of the home page (`home.css`): a column per part of the docs, each a title, a
 * line about it and its pages. A part that does not ship yet is plain text, marked as planned.
 */
export function HomeIndex(): ReactElement {
  return (
    <section className="docs-home__index" aria-label="Documentation index">
      {INDEX.map(({ title, subtitle, entries }) => (
        <div key={title} className="docs-home__column">
          <div className="docs-home__column-head">
            <h2 className="docs-home__column-title">{title}</h2>
            <p className="docs-home__column-subtitle">{subtitle}</p>
          </div>
          <ul className="docs-home__entries">
            {entries.map(({ label, href }) => (
              <li key={label} className="docs-home__entry">
                {href === undefined ? (
                  <>
                    <span>{label}</span>
                    <span className="docs-home__tag">planned</span>
                  </>
                ) : (
                  <Link asChild variant="neutral">
                    <RouterLink to={href}>{label}</RouterLink>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
