import { vars } from '@contour-ui/tokens';
import { useMemo, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { page, userEvent } from 'vite-plus/test/browser';

import { createListCollection, Listbox } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

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

/** Columns of the width of a sidebar or a small dialog. */
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

interface DocsResult {
  readonly url: string;
  readonly page: string;
  readonly text: string;
}

const DOCS: readonly DocsResult[] = [
  { url: '/docs/essentials/alert', page: 'Alert', text: 'Alert' },
  { url: '/docs/essentials/alert#status', page: 'Alert', text: 'Status' },
  { url: '/docs/essentials/button', page: 'Button', text: 'Button' },
  { url: '/docs/essentials/button#variants', page: 'Button', text: 'Variants' },
  { url: '/docs/essentials/button#sizes', page: 'Button', text: 'Sizes' },
  { url: '/docs/essentials/button#icon-buttons', page: 'Button', text: 'Icon buttons' },
  { url: '/docs/essentials/card', page: 'Card', text: 'Card' },
  { url: '/docs/essentials/card#variants', page: 'Card', text: 'Variants' },
  { url: '/docs/essentials/card#sizes', page: 'Card', text: 'Sizes' },
  { url: '/docs/essentials/code-block', page: 'CodeBlock', text: 'CodeBlock' },
  { url: '/docs/essentials/code-block#copy', page: 'CodeBlock', text: 'Copy' },
  { url: '/docs/essentials/code-block#line-numbers', page: 'CodeBlock', text: 'Line numbers' },
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

const searchField = () => page.getByRole('combobox', { name: 'Search the docs' });

visualStates({
  // Every state, without focus: a highlighted item (Sawtooth), a selected one (Square) and a
  // disabled one (Noise); groups with their labels; a search box that found nothing; a disabled
  // listbox.
  states: {
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
  },
  // The search box of the docs, after a few keys: up and down the results, a query, then every
  // result again, the first one highlighted.
  search: {
    render: () => <DocsSearch />,
    ready: async () => {
      // Focus the field rather than click it: the pointer stays off the list, whose highlight
      // follows it.
      searchField().element().focus();
      await userEvent.keyboard('{ArrowUp}');
      await userEvent.keyboard('{ArrowDown}'.repeat(11));
      await userEvent.type(searchField(), 'size');
      await userEvent.clear(searchField());
    },
    focused: searchField,
  },
});
