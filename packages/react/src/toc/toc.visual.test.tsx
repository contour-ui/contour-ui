import { vars } from '@contour-ui/tokens';
import type { ReactElement } from 'react';
import { afterEach, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';

import { Toc } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

interface Section {
  readonly value: string;
  readonly depth: number;
  readonly title: string;
  readonly text: string;
}

/** A page of a synthesizer manual, with headings down to `h4`. */
const sections: readonly Section[] = [
  {
    value: 'oscillators',
    depth: 2,
    title: 'Oscillators',
    text: 'Two oscillators make the raw sound. Each one plays a saw, a square or a sine wave, and the second one can be detuned against the first for a wider tone.',
  },
  {
    value: 'filter',
    depth: 2,
    title: 'Filter',
    text: 'The filter takes away the high end of the sound. Turn the cutoff down for a darker tone, and the resonance up to make the cutoff sing.',
  },
  {
    value: 'envelopes',
    depth: 2,
    title: 'Envelopes',
    text: 'An envelope shapes a sound over time, from the moment a key goes down until the sound fades out after the key is released.',
  },
  {
    value: 'attack-and-decay',
    depth: 3,
    title: 'Attack and decay',
    text: 'The attack sets how fast the sound rises; the decay, how fast it falls to the sustain level that it keeps while the key is held.',
  },
  {
    value: 'velocity',
    depth: 4,
    title: 'Velocity',
    text: 'With velocity on, a key struck harder opens the envelope wider, so the loudest notes are also the brightest.',
  },
  {
    value: 'release',
    depth: 3,
    title: 'Release',
    text: 'The release sets how long the sound takes to fade out once the key is up. A long release lets notes ring into each other.',
  },
  {
    value: 'effects',
    depth: 2,
    title: 'Effects',
    text: 'A chorus, a delay and a reverb follow the filter. Each one has a mix control: at zero the effect is off, at full only the effect is heard.',
  },
];

const items = sections.map(({ value, depth }) => ({ value, depth }));

/** The id of the scroll container of the article. */
const ARTICLE = 'manual';

/** The article: a scroll container of its own, beside the table of contents. */
function Manual(): ReactElement {
  return (
    <section
      id={ARTICLE}
      aria-label="Manual"
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll container takes focus, so the keyboard can scroll it.
      tabIndex={0}
      style={{
        flex: 1,
        blockSize: '18rem',
        overflow: 'auto',
        paddingInline: vars.space['panel-inset'],
        border: `${vars['border-width'].default} solid ${vars.color.border.default}`,
        borderRadius: vars.radius.panel,
      }}
    >
      {sections.map(({ value, title, text, depth }) => {
        const Heading = depth === 2 ? 'h2' : depth === 3 ? 'h3' : 'h4';
        return (
          <section key={value}>
            <Heading id={value}>{title}</Heading>
            <p>{text}</p>
            <p>{text}</p>
          </section>
        );
      })}
      <p style={{ blockSize: '14rem' }}>End of the manual.</p>
    </section>
  );
}

/** The table of contents of the manual. */
function Contents(props: Partial<Toc.RootProps>): ReactElement {
  return (
    <Toc.Root
      items={items}
      scrollEl={() => document.querySelector<HTMLElement>(`#${ARTICLE}`)}
      {...props}
    >
      <Toc.Title>On this page</Toc.Title>
      <Toc.Indicator />
      <Toc.List>
        {sections.map(({ value, depth, title }) => (
          <Toc.Item key={value} item={{ value, depth }}>
            <Toc.Link>{title}</Toc.Link>
          </Toc.Item>
        ))}
      </Toc.List>
    </Toc.Root>
  );
}

/** The table of contents in a column of its own, as on a docs page. */
function Layout({ children }: { readonly children: ReactElement }): ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: vars.space['section-gap'] }}>
      <div style={{ inlineSize: '12rem', flexShrink: 0 }}>{children}</div>
      <Manual />
    </div>
  );
}

/** The scroll container of the article. */
function article(): HTMLElement {
  const element = document.querySelector<HTMLElement>(`#${ARTICLE}`);
  if (element === null) {
    throw new Error('The state renders the article.');
  }
  return element;
}

const link = (name: string) => page.getByRole('link', { name });

/** Whether the link of a heading is the current one. */
const current = (name: string): boolean => link(name).element().ariaCurrent === 'true';

// A click on a link puts its heading in the address: give the page its address back.
const url = location.href;
afterEach(() => {
  history.replaceState(history.state, '', url);
});

visualStates({
  // The table of contents beside an article that scrolls in its own container, after a press on
  // the link to Envelopes: the article scrolled to it, which is current, and focused its heading.
  default: {
    render: () => (
      <Layout>
        <Contents />
      </Layout>
    ),
    ready: async () => {
      await vi.waitFor(() => {
        if (!current('Oscillators')) {
          throw new Error('Oscillators is not current yet.');
        }
      });
      // From the keyboard rather than with a click: the focus that moves to the heading shows its
      // ring, and the pointer hovers nothing.
      link('Envelopes').element().focus();
      await userEvent.keyboard('{Enter}');
      // Until the smooth scroll is over: the article holds still between two checks.
      let top: number | undefined;
      await vi.waitFor(
        () => {
          const moved = article().scrollTop !== top;
          top = article().scrollTop;
          if (
            moved ||
            !current('Envelopes') ||
            link('Oscillators').element().matches('[data-active]')
          ) {
            throw new Error('Envelopes is not current yet.');
          }
        },
        { timeout: 3000, interval: 100 },
      );
    },
    focused: () => page.getByRole('heading', { name: 'Envelopes' }),
  },
  // A long table of contents in a panel that scrolls, as in a narrow sidebar, once the article is
  // scrolled to its end: the panel keeps the first active link in view.
  'in-scrolling-panel': {
    render: () => (
      <Layout>
        <div style={{ blockSize: '7rem', overflow: 'auto' }}>
          <Contents scrollBehavior="instant" />
        </div>
      </Layout>
    ),
    ready: async () => {
      article().scrollTop = article().scrollHeight;
      const effects = link('Effects').element();
      await vi.waitFor(() => {
        const panel = document.querySelector('nav')?.parentElement?.getBoundingClientRect();
        if (!current('Effects') || effects.getBoundingClientRect().bottom > (panel?.bottom ?? 0)) {
          throw new Error('Effects is not current and in view yet.');
        }
      });
    },
  },
});
