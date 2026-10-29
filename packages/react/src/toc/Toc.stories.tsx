import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactElement } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Toc } from '../index.ts';

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

/** Story layout: the table of contents in a column of its own, as on a docs page. */
function Layout({ children }: { readonly children: ReactElement }): ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: vars.space['section-gap'] }}>
      <div style={{ inlineSize: '12rem', flexShrink: 0 }}>{children}</div>
      <Manual />
    </div>
  );
}

const meta: Meta<typeof Toc.Root> = {
  title: 'Essentials/Toc',
  component: Toc.Root,
  tags: ['autodocs'],
  beforeEach: () => {
    // A click on a link puts its heading in the address: give the story its address back.
    const url = location.href;
    return () => {
      history.replaceState(history.state, '', url);
    };
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The table of contents beside an article that scrolls in its own container. The links of the
 * headings in the upper part of the article are active, and the indicator spans them; nested
 * headings are indented. The play function clicks "Envelopes": the article scrolls to it, and
 * the story ends with it current.
 */
export const Default: Story = {
  render: () => (
    <Layout>
      <Contents />
    </Layout>
  ),
  play: async ({ canvas, canvasElement }) => {
    const link = (name: string) => canvas.getByRole('link', { name });
    await waitFor(async () => {
      await expect(link('Oscillators')).toHaveAttribute('aria-current', 'true');
    });

    await userEvent.click(link('Envelopes'));
    await expect(location.hash).toBe('#envelopes');
    await waitFor(
      async () => {
        await expect(link('Envelopes')).toHaveAttribute('aria-current', 'true');
        await expect(link('Oscillators')).not.toHaveAttribute('data-active');
      },
      { timeout: 3000 },
    );
    const indicator = canvasElement.querySelector('.contour-toc__indicator');
    await expect(indicator).toBeVisible();
  },
};

/**
 * A long table of contents in a panel that scrolls, as in a narrow sidebar: the panel keeps the
 * first active link in view, without scrolling the page.
 */
export const InScrollingPanel: Story = {
  render: () => (
    <Layout>
      <div style={{ blockSize: '7rem', overflow: 'auto' }}>
        <Contents scrollBehavior="instant" />
      </div>
    </Layout>
  ),
  play: async ({ canvas, canvasElement }) => {
    const article = canvasElement.querySelector(`#${ARTICLE}`);
    if (article === null) {
      throw new Error('The story renders the article.');
    }
    article.scrollTop = article.scrollHeight;
    const effects = canvas.getByRole('link', { name: 'Effects' });
    await waitFor(async () => {
      await expect(effects).toHaveAttribute('aria-current', 'true');
    });
    // The panel scrolled the link into its view; the page did not move.
    const panel = canvasElement.querySelector('nav')?.parentElement;
    await waitFor(async () => {
      const box = panel?.getBoundingClientRect();
      await expect(effects.getBoundingClientRect().bottom).toBeLessThanOrEqual(box?.bottom ?? 0);
    });
    await expect(window.scrollY).toBe(0);
  },
};
