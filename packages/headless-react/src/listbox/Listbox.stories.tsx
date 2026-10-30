import type { listbox } from '@contour-ui/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { createListCollection, Listbox } from '../index.ts';

/**
 * Headless renders no CSS: just enough here to see the list, the highlight and the selection,
 * by the data attributes of the parts.
 */
const css = `
  [data-scope='listbox'][data-part='content'] {
    display: flex; flex-direction: column; max-block-size: 12rem; overflow-y: auto;
    border: 1px solid; padding: 2px;
  }
  [data-scope='listbox'][data-part='item'] { padding: 2px 6px; cursor: default; }
  [data-scope='listbox'][data-part='item'][data-highlighted] { background: #d6d6d6; }
  [data-scope='listbox'][data-part='item'][data-disabled] { color: #6b6b6b; }
  [data-scope='listbox'][data-part='item-group-label'] { font-weight: bold; padding: 6px 6px 2px; }
`;

interface Waveform {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

const WAVEFORMS: readonly Waveform[] = [
  { value: 'sine', label: 'Sine' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'sawtooth', label: 'Sawtooth' },
  { value: 'square', label: 'Square' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'noise', label: 'Noise', disabled: true },
];

const waveforms = createListCollection({ items: WAVEFORMS });

/** Reports the selections of the stories, as an app would act on them. */
const onSelect = fn<(details: listbox.SelectDetails) => void>().mockName('onSelect');

const meta: Meta<typeof Listbox.Root> = {
  title: 'Headless/Listbox',
  component: Listbox.Root,
  tags: ['autodocs'],
  beforeEach: () => {
    onSelect.mockClear();
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** One item of the stories: its text and a check mark while it is selected. */
function Item({ item }: { readonly item: Waveform }): ReactElement {
  return (
    <Listbox.Item item={item}>
      <Listbox.ItemText>{item.label}</Listbox.ItemText>{' '}
      <Listbox.ItemIndicator>✓</Listbox.ItemIndicator>
    </Listbox.Item>
  );
}

/**
 * A single selection with a label. Tab focuses the list and highlights its first item; the
 * arrows, Home and End move the highlight past the disabled Noise; typing finds an item by its
 * first letters; Enter, Space and a click select.
 */
export const Default: Story = {
  render: () => (
    <Listbox.Root collection={waveforms} onSelect={onSelect}>
      <style>{css}</style>
      <Listbox.Label>Waveform</Listbox.Label>
      <Listbox.Content>
        {waveforms.items.map((item) => (
          <Item key={item.value} item={item} />
        ))}
      </Listbox.Content>
    </Listbox.Root>
  ),
  play: async ({ canvas }) => {
    const list = canvas.getByRole('listbox', { name: 'Waveform' });
    const option = (name: string): HTMLElement => canvas.getByRole('option', { name });
    const highlighted = (): string | null => list.getAttribute('aria-activedescendant');

    await userEvent.tab();
    await expect(list).toHaveFocus();
    await expect(highlighted()).toBe(option('Sine').id);
    await expect(option('Sine')).toHaveAttribute('data-highlighted');

    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(highlighted()).toBe(option('Sawtooth').id);
    await userEvent.keyboard('{End}');
    // Noise is disabled.
    await expect(highlighted()).toBe(option('Pulse').id);
    await expect(option('Noise')).toHaveAttribute('aria-disabled', 'true');
    await userEvent.keyboard('{Home}');
    await expect(highlighted()).toBe(option('Sine').id);

    // Each S moves to the next item that starts with it.
    await userEvent.keyboard('s');
    await expect(highlighted()).toBe(option('Sawtooth').id);
    await userEvent.keyboard('s');
    await expect(highlighted()).toBe(option('Square').id);

    await userEvent.keyboard('{Enter}');
    await expect(option('Square')).toHaveAttribute('aria-selected', 'true');
    await expect(option('Square').querySelector('[data-part="item-indicator"]')).toBeVisible();
    await expect(onSelect).toHaveBeenLastCalledWith({ value: 'square', item: WAVEFORMS[3] });

    await userEvent.click(option('Triangle'));
    await expect(option('Triangle')).toHaveAttribute('aria-selected', 'true');
    await expect(option('Square')).toHaveAttribute('aria-selected', 'false');
    await expect(list).toHaveFocus();
  },
};

interface DocsResult {
  /** The URL of the page or of its heading. */
  readonly url: string;
  readonly page: string;
  readonly text: string;
}

const DOCS: readonly DocsResult[] = [
  { url: '/docs/essentials/button', page: 'Button', text: 'Button' },
  { url: '/docs/essentials/button#variants', page: 'Button', text: 'Variants' },
  { url: '/docs/essentials/button#sizes', page: 'Button', text: 'Sizes' },
  { url: '/docs/essentials/card', page: 'Card', text: 'Card' },
  { url: '/docs/essentials/card#variants', page: 'Card', text: 'Variants' },
  { url: '/docs/essentials/card#as-a-link', page: 'Card', text: 'As a link' },
  { url: '/docs/essentials/code-block', page: 'CodeBlock', text: 'CodeBlock' },
  { url: '/docs/essentials/code-block#copy', page: 'CodeBlock', text: 'Copy' },
  { url: '/docs/essentials/code-block#line-numbers', page: 'CodeBlock', text: 'Line numbers' },
];

/** The results of a query: the pages and headings whose text has it, grouped by page. */
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
    <Listbox.Root collection={collection} autoHighlight onSelect={onSelect}>
      <style>{css}</style>
      <Listbox.Input
        aria-label="Search the docs"
        placeholder="Search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
      />
      <Listbox.Content aria-label="Results">
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
 * The search box of the docs: the list is always open under the input and filters as you type,
 * in groups by page. The focus stays in the input: ↓ and ↑ move the highlight in the list
 * (`aria-activedescendant`), the first result is highlighted as you type (`autoHighlight`), and
 * Enter or a click selects a result, which the app opens. "No results" shows when nothing
 * matches.
 */
export const Search: Story = {
  render: () => <DocsSearch />,
  play: async ({ canvas }) => {
    const input = canvas.getByRole('combobox', { name: 'Search the docs' });
    const option = (name: string, group: string): HTMLElement =>
      within(canvas.getByRole('group', { name: group })).getByRole('option', { name });

    await userEvent.click(input);
    await userEvent.keyboard('variants');
    await expect(canvas.getAllByRole('option')).toHaveLength(2);
    await expect(input).toHaveAttribute('aria-activedescendant', option('Variants', 'Button').id);
    await userEvent.keyboard('{ArrowDown}');
    // Into the next group.
    await expect(input).toHaveAttribute('aria-activedescendant', option('Variants', 'Card').id);
    await expect(input).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(onSelect).toHaveBeenCalledTimes(1);
    await expect(onSelect).toHaveBeenCalledWith({
      value: '/docs/essentials/card#variants',
      item: DOCS[4],
    });

    await userEvent.clear(input);
    await userEvent.keyboard('copy');
    await userEvent.click(canvas.getByRole('option', { name: 'Copy' }));
    await expect(onSelect).toHaveBeenLastCalledWith({
      value: '/docs/essentials/code-block#copy',
      item: DOCS[7],
    });
    // A click keeps the focus in the input.
    await expect(input).toHaveFocus();

    await userEvent.clear(input);
    await userEvent.keyboard('zzz');
    await waitFor(async () => {
      await expect(canvas.getByText('No results')).toHaveAttribute('data-part', 'empty');
    });
    await expect(canvas.queryAllByRole('option')).toHaveLength(0);
    await expect(input).not.toHaveAttribute('aria-activedescendant');
  },
};

const EFFECTS = createListCollection({
  items: ['Chorus', 'Delay', 'Distortion', 'Phaser', 'Reverb'],
});

/** A multiple selection: each click or Enter toggles an item. */
export const Multiple: Story = {
  render: () => (
    <Listbox.Root collection={EFFECTS} selectionMode="multiple" defaultValue={['Delay']}>
      <style>{css}</style>
      <Listbox.Label>Effects</Listbox.Label>
      <Listbox.Content>
        {EFFECTS.items.map((effect) => (
          <Listbox.Item key={effect} item={effect}>
            <Listbox.ItemText>{effect}</Listbox.ItemText>{' '}
            <Listbox.ItemIndicator>✓</Listbox.ItemIndicator>
          </Listbox.Item>
        ))}
      </Listbox.Content>
    </Listbox.Root>
  ),
  play: async ({ canvas }) => {
    const list = canvas.getByRole('listbox', { name: 'Effects' });
    await expect(list).toHaveAttribute('aria-multiselectable', 'true');

    await userEvent.click(canvas.getByRole('option', { name: 'Reverb' }));
    await userEvent.click(canvas.getByRole('option', { name: 'Delay' }));
    await userEvent.keyboard('{Home}{Enter}');
    const selected = canvas
      .getAllByRole('option')
      .filter((option) => option.getAttribute('aria-selected') === 'true')
      .map((option) => option.textContent);
    await expect(selected).toStrictEqual(['Chorus ✓', 'Reverb ✓']);
  },
};
