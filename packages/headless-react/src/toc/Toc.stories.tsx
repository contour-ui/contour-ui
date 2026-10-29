import type { toc } from '@contour-ui/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Toc } from '../index.ts';

interface Section extends toc.Item {
  readonly title: string;
  readonly text: string;
}

/** A page of a synthesizer manual, with a subsection. */
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
    value: 'effects',
    depth: 2,
    title: 'Effects',
    text: 'A chorus, a delay and a reverb follow the filter. Each one has a mix control: at zero the effect is off, at full only the effect is heard.',
  },
];

const items: readonly toc.Item[] = sections.map(({ value, depth }) => ({ value, depth }));

/** The id of the scroll container of the article. */
const ARTICLE = 'manual';

const indicatorStyle: CSSProperties = {
  position: 'absolute',
  insetInlineStart: 0,
  top: 'var(--top)',
  width: 2,
  height: 'var(--height)',
  background: 'currentColor',
  transition: 'top 150ms, height 150ms',
};

/** The article: a scroll container of its own, with the text of every section said thrice. */
function Manual(): ReactElement {
  return (
    <section
      id={ARTICLE}
      aria-label="Manual"
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll container takes focus, so the keyboard can scroll it.
      tabIndex={0}
      style={{ flex: 1, height: '16rem', overflow: 'auto', paddingInline: '1rem' }}
    >
      {sections.map(({ value, title, text }) => (
        <section key={value}>
          <h3 id={value}>{title}</h3>
          <p>{text}</p>
          <p>{text}</p>
          <p>{text}</p>
        </section>
      ))}
      <p style={{ height: '12rem' }}>End of the manual.</p>
    </section>
  );
}

/** The table of contents of the manual, its links indented by depth. */
function Contents(props: Partial<Toc.RootProps>): ReactElement {
  return (
    <Toc.Root
      items={items}
      scrollEl={() => document.querySelector<HTMLElement>(`#${ARTICLE}`)}
      style={{ position: 'relative', paddingInlineStart: '0.75rem', width: '12rem' }}
      {...props}
    >
      <Toc.Title>On this page</Toc.Title>
      <Toc.Indicator style={indicatorStyle} />
      <Toc.List style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {sections.map(({ value, depth, title }) => (
          <Toc.Item
            key={value}
            item={{ value, depth }}
            style={{ paddingInlineStart: `${depth - 2}rem` }}
          >
            <Toc.Link>{title}</Toc.Link>
          </Toc.Item>
        ))}
      </Toc.List>
    </Toc.Root>
  );
}

const meta: Meta<typeof Toc.Root> = {
  title: 'Headless/Toc',
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
 * A table of contents next to an article that scrolls in its own container (`scrollEl`). The
 * links of the headings in the upper part of the article are active (`data-active`), the
 * first one current (`aria-current`); an inline-styled indicator spans them with `--top` and
 * `--height`. A click scrolls to the heading and puts it in the address.
 */
export const Default: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
      <Contents />
      <Manual />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const link = (name: string) => canvas.getByRole('link', { name });
    await waitFor(async () => {
      await expect(link('Oscillators')).toHaveAttribute('aria-current', 'true');
    });

    // Scrolling the article moves the active section.
    const article = canvasElement.querySelector(`#${ARTICLE}`);
    const heading = canvasElement.querySelector('#envelopes');
    if (article === null || heading === null) {
      throw new Error('The story renders the article.');
    }
    article.scrollTop += heading.getBoundingClientRect().top - article.getBoundingClientRect().top;
    await waitFor(async () => {
      await expect(link('Envelopes')).toHaveAttribute('aria-current', 'true');
    });
    await expect(link('Oscillators')).not.toHaveAttribute('data-active');

    // A click scrolls to the heading, smoothly, and puts it in the address.
    await userEvent.click(link('Effects'));
    await expect(location.hash).toBe('#effects');
    await waitFor(
      async () => {
        await expect(link('Effects')).toHaveAttribute('aria-current', 'true');
      },
      { timeout: 3000 },
    );
  },
};

/** The owner keeps the active headings in its state and shows the section being read. */
function ControlledManual(): ReactElement {
  const [activeIds, setActiveIds] = useState<readonly string[]>([]);
  const reading = sections.find(({ value }) => value === activeIds[0])?.title ?? 'Nothing';
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <p>Reading: {reading}</p>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <Contents
          activeIds={activeIds}
          onActiveChange={(details) => {
            setActiveIds(details.activeIds);
          }}
        />
        <Manual />
      </div>
    </div>
  );
}

/** Controlled active headings: `onActiveChange` reports them, and the owner passes them back. */
export const Controlled: Story = {
  render: () => <ControlledManual />,
  play: async ({ canvas }) => {
    await waitFor(async () => {
      await expect(canvas.getByText('Reading: Oscillators')).toBeVisible();
    });
    await userEvent.click(canvas.getByRole('link', { name: 'Filter' }));
    await waitFor(
      async () => {
        await expect(canvas.getByText('Reading: Filter')).toBeVisible();
      },
      { timeout: 3000 },
    );
  },
};
