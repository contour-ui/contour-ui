import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { createListCollection, Listbox } from '../index.ts';

interface Option {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

const waveforms = createListCollection<Option>({
  items: [
    { value: 'sine', label: 'Sine' },
    { value: 'triangle', label: 'Triangle' },
    { value: 'sawtooth', label: 'Sawtooth' },
    { value: 'square', label: 'Square' },
    { value: 'noise', label: 'Noise', disabled: true },
  ],
});

interface Sound extends Option {
  readonly section: string;
}

const sounds = createListCollection<Sound>({
  items: [
    { value: 'pad', label: 'Warm pad', section: 'Synth' },
    { value: 'lead', label: 'Bright lead', section: 'Synth' },
    { value: 'kick', label: 'Kick', section: 'Drums' },
    { value: 'snare', label: 'Snare', section: 'Drums' },
    { value: 'hat', label: 'Closed hat', section: 'Drums' },
  ],
  groupBy: (sound) => sound.section,
});

const none = createListCollection<Option>({ items: [] });

/** Story layout: columns of the width of a sidebar or a small dialog. */
const columns: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))',
  alignItems: 'start',
  gap: vars.space['section-gap'],
};

/** An item with its text and the check mark of a selection. */
function Item({ item }: { readonly item: Option }): ReactElement {
  return (
    <Listbox.Item item={item}>
      <Listbox.ItemText>{item.label}</Listbox.ItemText>
      <Listbox.ItemIndicator />
    </Listbox.Item>
  );
}

const meta: Meta<typeof Listbox.Root> = {
  title: 'Essentials/Listbox',
  component: Listbox.Root,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Every state, without focus: a highlighted item (Sawtooth), a selected one (Square) and a
 * disabled one (Noise); groups with their labels; a search box that found nothing; a disabled
 * listbox.
 */
export const States: Story = {
  render: () => (
    <div style={columns}>
      <Listbox.Root
        collection={waveforms}
        defaultValue={['square']}
        defaultHighlightedValue="sawtooth"
      >
        <Listbox.Label>Waveform</Listbox.Label>
        <Listbox.Content>
          {waveforms.items.map((item) => (
            <Item key={item.value} item={item} />
          ))}
        </Listbox.Content>
      </Listbox.Root>

      <Listbox.Root collection={sounds} defaultValue={['kick']}>
        <Listbox.Label>Sound</Listbox.Label>
        <Listbox.Content>
          {sounds.groups.map((group) => (
            <Listbox.ItemGroup key={group.key}>
              <Listbox.ItemGroupLabel>{group.key}</Listbox.ItemGroupLabel>
              {group.items.map((item) => (
                <Item key={item.value} item={item} />
              ))}
            </Listbox.ItemGroup>
          ))}
        </Listbox.Content>
      </Listbox.Root>

      <Listbox.Root collection={none}>
        <Listbox.Label>Preset</Listbox.Label>
        <Listbox.Input defaultValue="glass harp" />
        <Listbox.Content />
        <Listbox.Empty>No results</Listbox.Empty>
      </Listbox.Root>

      <Listbox.Root collection={waveforms} defaultValue={['triangle']} disabled>
        <Listbox.Label>Waveform (disabled)</Listbox.Label>
        <Listbox.Content>
          {waveforms.items.map((item) => (
            <Item key={item.value} item={item} />
          ))}
        </Listbox.Content>
      </Listbox.Root>
    </div>
  ),
  play: async ({ canvas }) => {
    const waveform = within(canvas.getByRole('listbox', { name: 'Waveform' }));
    await expect(waveform.getByRole('option', { name: 'Sawtooth' })).toHaveAttribute(
      'data-highlighted',
    );
    const square = waveform.getByRole('option', { name: 'Square' });
    await expect(square).toHaveAttribute('aria-selected', 'true');
    await expect(square.querySelector('.contour-listbox__item-indicator')).toBeVisible();
    await expect(waveform.getByRole('option', { name: 'Noise' })).toHaveAttribute('data-disabled');

    const sound = within(canvas.getByRole('listbox', { name: 'Sound' }));
    await expect(sound.getByRole('group', { name: 'Drums' })).toHaveClass(
      'contour-listbox__item-group',
    );
    await expect(canvas.getByText('No results')).toHaveClass('contour-listbox__empty');
    await expect(canvas.getByRole('listbox', { name: 'Waveform (disabled)' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  },
};

interface DocsResult {
  readonly url: string;
  readonly page: string;
  readonly text: string;
}

const DOCS: readonly DocsResult[] = [
  { url: '/docs/kit/alert', page: 'Alert', text: 'Alert' },
  { url: '/docs/kit/alert#status', page: 'Alert', text: 'Status' },
  { url: '/docs/kit/button', page: 'Button', text: 'Button' },
  { url: '/docs/kit/button#variants', page: 'Button', text: 'Variants' },
  { url: '/docs/kit/button#sizes', page: 'Button', text: 'Sizes' },
  { url: '/docs/kit/button#icon-buttons', page: 'Button', text: 'Icon buttons' },
  { url: '/docs/kit/card', page: 'Card', text: 'Card' },
  { url: '/docs/kit/card#variants', page: 'Card', text: 'Variants' },
  { url: '/docs/kit/card#sizes', page: 'Card', text: 'Sizes' },
  { url: '/docs/kit/code-block', page: 'CodeBlock', text: 'CodeBlock' },
  { url: '/docs/kit/code-block#copy', page: 'CodeBlock', text: 'Copy' },
  { url: '/docs/kit/code-block#line-numbers', page: 'CodeBlock', text: 'Line numbers' },
];

/** The search of the docs: an input, and the results under it, grouped by page. */
function DocsSearch(): ReactElement {
  const [query, setQuery] = useState('');
  const collection = useMemo(() => {
    const words = query.trim().toLowerCase();
    return createListCollection({
      items: DOCS.filter((result) => `${result.page} ${result.text}`.toLowerCase().includes(words)),
      itemToValue: (result) => result.url,
      itemToString: (result) => result.text,
      groupBy: (result) => result.page,
    });
  }, [query]);
  return (
    <Listbox.Root collection={collection} autoHighlight style={{ maxInlineSize: '24rem' }}>
      <Listbox.Input
        aria-label="Search the docs"
        placeholder="Search the docs"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
      />
      <Listbox.Content aria-label="Results" style={{ maxBlockSize: '14rem' }}>
        {collection.groups.map((group) => (
          <Listbox.ItemGroup key={group.key}>
            <Listbox.ItemGroupLabel>{group.key}</Listbox.ItemGroupLabel>
            {group.items.map((result) => (
              <Listbox.Item key={result.url} item={result}>
                <Listbox.ItemText>{result.text}</Listbox.ItemText>
              </Listbox.Item>
            ))}
          </Listbox.ItemGroup>
        ))}
      </Listbox.Content>
      <Listbox.Empty>No results</Listbox.Empty>
    </Listbox.Root>
  );
}

/**
 * The search box of the docs: the results stay open under the input, grouped by page, and the
 * list scrolls within its height. The arrows move the highlight from the input, the first result
 * is highlighted as you type, and the highlighted result scrolls into view.
 */
export const Search: Story = {
  render: () => <DocsSearch />,
  play: async ({ canvas }) => {
    const input = canvas.getByRole('combobox', { name: 'Search the docs' });
    const list = canvas.getByRole('listbox', { name: 'Results' });
    const highlighted = (): string | null | undefined => {
      const id = input.getAttribute('aria-activedescendant');
      return id === null ? null : list.querySelector(`[id="${CSS.escape(id)}"]`)?.textContent;
    };

    await userEvent.click(input);
    await expect(highlighted()).toBe('Alert');
    await userEvent.keyboard('{ArrowUp}');
    // Stays on the first result: no loop.
    await expect(highlighted()).toBe('Alert');
    await userEvent.keyboard('{ArrowDown}'.repeat(11));
    await expect(highlighted()).toBe('Line numbers');
    // Scrolled to the end inside the list.
    await expect(list.scrollTop).toBeGreaterThan(0);
    await expect(list.scrollTop + list.clientHeight).toBeCloseTo(list.scrollHeight, 0);

    await userEvent.type(input, 'size');
    await expect(highlighted()).toBe('Sizes');
    await expect(canvas.getAllByRole('option')).toHaveLength(2);
    await expect(list.scrollTop).toBe(0);

    // Every result again, so the list scrolls for the a11y check that follows: it needs no focus
    // of its own, since it is the list of a combobox.
    await userEvent.clear(input);
    await expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
  },
};
