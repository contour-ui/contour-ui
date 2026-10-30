import type { listbox } from '@contour-ui/core';
import { expectNoAxeViolations } from '@contour-ui/vite-config/visual';
import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { createListCollection, Listbox, useListboxContext } from '../index.ts';
import type { ListCollection } from '../index.ts';

interface Preset {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

const PRESETS: readonly Preset[] = [
  { value: 'warm-pad', label: 'Warm pad' },
  { value: 'glass-bells', label: 'Glass bells' },
  { value: 'deep-bass', label: 'Deep bass', disabled: true },
  { value: 'bright-lead', label: 'Bright lead' },
  { value: 'new-age', label: 'New age' },
  { value: 'new-york-strings', label: 'New York strings' },
];

const presets = createListCollection({ items: PRESETS });

type Props = Partial<Listbox.RootProps<Preset>>;

/** A listbox of presets with a label, an item text and an indicator per item. */
function Presets({ collection = presets, children, ...props }: Props): ReactElement {
  return (
    <Listbox.Root {...props} collection={collection}>
      <Listbox.Label>Preset</Listbox.Label>
      <Listbox.Content>
        {collection.items.map((item) => (
          <Listbox.Item key={item.value} item={item}>
            <Listbox.ItemText>{item.label}</Listbox.ItemText>
            <Listbox.ItemIndicator>✓</Listbox.ItemIndicator>
          </Listbox.Item>
        ))}
      </Listbox.Content>
      <Listbox.Empty>No presets</Listbox.Empty>
      {children}
    </Listbox.Root>
  );
}

interface SearchProps extends Props {
  /** Focus the input as it mounts, as a search dialog does. */
  readonly focusOnMount?: boolean;
  /** Called when the form around the input is submitted. */
  readonly onSubmit?: () => void;
}

/** A search box over the presets: the input filters the collection, which the list shows. */
function PresetSearch({ focusOnMount = false, onSubmit, ...rootProps }: SearchProps): ReactElement {
  const [query, setQuery] = useState('');
  const collection = useMemo(
    () =>
      createListCollection({
        items: PRESETS.filter((preset) => preset.label.toLowerCase().includes(query)),
      }),
    [query],
  );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <Listbox.Root {...rootProps} collection={collection}>
        <Listbox.Label>Preset</Listbox.Label>
        <Listbox.Input
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- a search dialog focuses its field.
          autoFocus={focusOnMount}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
        <Listbox.Content>
          {collection.items.map((item) => (
            <Listbox.Item key={item.value} item={item}>
              <Listbox.ItemText>{item.label}</Listbox.ItemText>
            </Listbox.Item>
          ))}
        </Listbox.Content>
      </Listbox.Root>
    </form>
  );
}

/** The element of a listbox part. */
function part(container: HTMLElement, name: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(
    `[data-scope="listbox"][data-part="${name}"]`,
  );
  if (element === null) {
    throw new Error(`No listbox ${name}.`);
  }
  return element;
}

/** The text of the highlighted option an element points to. */
function activeOption(element: Element): string | null {
  const id = element.getAttribute('aria-activedescendant');
  return id === null ? null : (document.querySelector(`#${id}`)?.textContent ?? null);
}

const selectSpy = () => vi.fn<(details: listbox.SelectDetails) => void>();

/** A part of the owner's: the selected values, from the API of the root. */
function Selection(): ReactElement {
  const api = useListboxContext();
  return <output>{api.value.join(', ')}</output>;
}

/**
 * The examples' own styles: just enough to see the list, the highlight and the selection, by the
 * data attributes of the parts.
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

/** Waveforms: the last one is disabled. */
const WAVEFORMS: readonly Waveform[] = [
  { value: 'sine', label: 'Sine' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'sawtooth', label: 'Sawtooth' },
  { value: 'square', label: 'Square' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'noise', label: 'Noise', disabled: true },
];

const waveforms = createListCollection({ items: WAVEFORMS });

/** One waveform: its text and a check mark while it is selected. */
function Item({ item }: { readonly item: Waveform }): ReactElement {
  return (
    <Listbox.Item item={item}>
      <Listbox.ItemText>{item.label}</Listbox.ItemText>{' '}
      <Listbox.ItemIndicator>✓</Listbox.ItemIndicator>
    </Listbox.Item>
  );
}

/** A single selection of a waveform, with a label. */
function Waveforms(props: Partial<Listbox.RootProps<Waveform>>): ReactElement {
  return (
    <Listbox.Root {...props} collection={waveforms}>
      <style>{css}</style>
      <Listbox.Label>Waveform</Listbox.Label>
      <Listbox.Content>
        {waveforms.items.map((item) => (
          <Item key={item.value} item={item} />
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
}

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

/**
 * The search box of the docs: the results of a query, the pages and headings whose text has it,
 * grouped by page under the input, the first one highlighted as the user types.
 */
function DocsSearch({
  onSelect,
}: {
  readonly onSelect?: (details: listbox.SelectDetails) => void;
}): ReactElement {
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

const EFFECTS = createListCollection({
  items: ['Chorus', 'Delay', 'Distortion', 'Phaser', 'Reverb'],
});

/** A multiple selection of effects, Delay selected to start with. */
function Effects(): ReactElement {
  return (
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
  );
}

describe('Listbox', () => {
  it('renders its parts with their roles and the references between them', async () => {
    const screen = await render(<PresetSearch />);
    const list = screen.getByRole('listbox', { name: 'Preset' });
    const input = screen.getByRole('combobox', { name: 'Preset' });
    const label = part(screen.container, 'label');

    await expect.element(label).toHaveAttribute('for', input.element().id);
    // A combobox whose list is always shown.
    await expect.element(input).toHaveAttribute('role', 'combobox');
    await expect.element(input).toHaveAttribute('aria-expanded', 'true');
    await expect.element(input).toHaveAttribute('aria-controls', list.element().id);
    await expect.element(input).toHaveAttribute('aria-autocomplete', 'list');
    await expect.element(input).toHaveAttribute('autocomplete', 'off');
    await expect.element(list).toHaveAttribute('aria-labelledby', label.id);
    // The input takes the keys: the list stays out of the tab order.
    await expect.element(list).toHaveAttribute('tabindex', '-1');
    await expect.element(list).toHaveAttribute('data-orientation', 'vertical');
    await expect.element(list).not.toHaveAttribute('aria-multiselectable');

    const option = screen.getByRole('option', { name: 'Warm pad' });
    await expect.element(option).toHaveAttribute('aria-selected', 'false');
    await expect.element(option).toHaveAttribute('data-value', 'warm-pad');
    await expect
      .element(screen.getByRole('option', { name: 'Deep bass' }))
      .toHaveAttribute('aria-disabled', 'true');
    expect(part(screen.container, 'root')).toHaveAttribute('data-orientation', 'vertical');
  });

  it('puts the list in the tab order without an input, and names it by the label', async () => {
    const screen = await render(<Presets />);
    const list = screen.getByRole('listbox', { name: 'Preset' });

    await expect.element(list).toHaveAttribute('tabindex', '0');
    await expect.element(part(screen.container, 'label')).not.toHaveAttribute('for');
    // The indicator shows only for a selected item, and never to assistive technology.
    const indicator = part(screen.container, 'item-indicator');
    expect(indicator).toHaveAttribute('aria-hidden', 'true');
    expect(indicator).not.toBeVisible();
  });

  it('follows the ids given to the parts', async () => {
    const screen = await render(
      <Listbox.Root collection={presets}>
        <Listbox.Label id="preset-label">Preset</Listbox.Label>
        <Listbox.Input id="preset-search" />
        <Listbox.Content id="preset-list" />
      </Listbox.Root>,
    );

    await expect
      .element(screen.getByRole('listbox'))
      .toHaveAttribute('aria-labelledby', 'preset-label');
    await expect.element(part(screen.container, 'label')).toHaveAttribute('for', 'preset-search');
    await expect
      .element(screen.getByRole('combobox', { name: 'Preset' }))
      .toHaveAttribute('aria-controls', 'preset-list');
  });

  describe('in the list', () => {
    it('moves the highlight with the keys and selects with Enter and Space', async () => {
      const onSelect = selectSpy();
      const screen = await render(<Presets onSelect={onSelect} />);
      const list = screen.getByRole('listbox');

      await userEvent.tab();
      await expect.element(list).toHaveFocus();
      expect(activeOption(list.element())).toBe('Warm pad✓');
      await userEvent.keyboard('{ArrowDown}{ArrowDown}');
      expect(activeOption(list.element())).toBe('Bright lead✓');
      await expect
        .element(screen.getByRole('option', { name: 'Bright lead' }))
        .toHaveAttribute('data-highlighted', '');

      await userEvent.keyboard('{Enter}');
      await expect
        .element(screen.getByRole('option', { name: 'Bright lead' }))
        .toHaveAttribute('aria-selected', 'true');
      await userEvent.keyboard('{End} ');
      await expect
        .element(screen.getByRole('option', { name: 'New York strings' }))
        .toHaveAttribute('data-selected', '');
      expect(onSelect.mock.calls.map(([details]) => details.value)).toStrictEqual([
        'bright-lead',
        'new-york-strings',
      ]);
    });

    it('finds an item by its first letters', async () => {
      const screen = await render(<Presets />);
      const list = screen.getByRole('listbox');

      await userEvent.tab();
      await userEvent.keyboard('g');
      expect(activeOption(list.element())).toBe('Glass bells✓');
    });

    it('moves on to the next match with each press of the same letter', async () => {
      const screen = await render(<Waveforms />);
      const list = screen.getByRole('listbox', { name: 'Waveform' });

      await userEvent.tab();
      expect(activeOption(list.element())).toBe('Sine ✓');
      await userEvent.keyboard('s');
      expect(activeOption(list.element())).toBe('Sawtooth ✓');
      await userEvent.keyboard('s');
      expect(activeOption(list.element())).toBe('Square ✓');
    });

    it('moves to the first and the last enabled item with Home and End', async () => {
      const screen = await render(<Waveforms />);
      const list = screen.getByRole('listbox', { name: 'Waveform' });

      await userEvent.tab();
      await userEvent.keyboard('{End}');
      // Noise, the last item, is disabled.
      expect(activeOption(list.element())).toBe('Pulse ✓');
      await userEvent.keyboard('{Home}');
      expect(activeOption(list.element())).toBe('Sine ✓');
    });

    it('shows the indicator of the selected item only, and replaces a single selection', async () => {
      const screen = await render(<Waveforms />);
      const option = (name: string) => screen.getByRole('option', { name });
      const indicator = (name: string) =>
        option(name).element().querySelector('[data-part="item-indicator"]');

      await userEvent.click(option('Square'));
      await expect.element(option('Square')).toHaveAttribute('aria-selected', 'true');
      expect(indicator('Square')).toBeVisible();

      await userEvent.click(option('Triangle'));
      await expect.element(option('Triangle')).toHaveAttribute('aria-selected', 'true');
      await expect.element(option('Square')).toHaveAttribute('aria-selected', 'false');
      expect(indicator('Square')).not.toBeVisible();
    });

    it('takes a space typed between letters as part of the query, not as a selection', async () => {
      const onSelect = selectSpy();
      const screen = await render(<Presets onSelect={onSelect} />);
      const list = screen.getByRole('listbox');

      await userEvent.tab();
      await userEvent.keyboard('new y');
      expect(activeOption(list.element())).toBe('New York strings✓');
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('wraps around with loopFocus', async () => {
      const screen = await render(<Presets loopFocus />);
      const list = screen.getByRole('listbox');

      await userEvent.tab();
      await userEvent.keyboard('{ArrowUp}');
      expect(activeOption(list.element())).toBe('New York strings✓');
      await userEvent.keyboard('{ArrowDown}');
      expect(activeOption(list.element())).toBe('Warm pad✓');
    });

    it('steps with ← and → in a horizontal list, as the text runs', async () => {
      const screen = await render(
        <div dir="rtl">
          <Presets orientation="horizontal" />
        </div>,
      );
      const list = screen.getByRole('listbox');

      await expect.element(list).toHaveAttribute('aria-orientation', 'horizontal');
      await userEvent.tab();
      await userEvent.keyboard('{ArrowLeft}');
      expect(activeOption(list.element())).toBe('Glass bells✓');
      await userEvent.keyboard('{ArrowDown}{ArrowRight}');
      expect(activeOption(list.element())).toBe('Warm pad✓');
    });

    it('highlights the selected item when it gets focus, and nothing once it loses it', async () => {
      const screen = await render(
        <>
          <Presets defaultValue={['bright-lead']} />
          <button type="button">After</button>
        </>,
      );
      const list = screen.getByRole('listbox');

      await userEvent.tab();
      expect(activeOption(list.element())).toBe('Bright lead✓');
      await userEvent.tab();
      await expect.element(screen.getByRole('button', { name: 'After' })).toHaveFocus();
      await expect.element(list).not.toHaveAttribute('aria-activedescendant');
      await expect
        .element(screen.getByRole('option', { name: 'Bright lead' }))
        .not.toHaveAttribute('data-highlighted');
    });

    it('keeps the highlighted item in view inside the list, and never scrolls the page', async () => {
      const many = createListCollection({
        items: Array.from({ length: 40 }, (_, index) => `Preset ${index + 1}`),
      });
      const screen = await render(
        <div style={{ paddingBlock: '150vh' }}>
          <Listbox.Root collection={many}>
            <Listbox.Content aria-label="Presets" style={{ height: '100px', overflowY: 'auto' }}>
              {many.items.map((item) => (
                <Listbox.Item key={item} item={item} style={{ height: '20px' }}>
                  {item}
                </Listbox.Item>
              ))}
            </Listbox.Content>
          </Listbox.Root>
        </div>,
      );
      const list = screen.getByRole('listbox').element();
      list.focus({ preventScroll: true });
      const pageScroll = window.scrollY;

      await userEvent.keyboard('{End}');
      // The last item at the bottom of the list.
      expect(list.scrollTop).toBe(list.scrollHeight - list.clientHeight);
      await userEvent.keyboard('{Home}{ArrowDown}{ArrowDown}');
      expect(list.scrollTop).toBe(0);
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
      // Preset 8 is the fifth row of 20px: just in view at the bottom.
      expect(list.scrollTop).toBe(60);
      expect(window.scrollY).toBe(pageScroll);
    });
  });

  describe('with an input', () => {
    it('moves the highlight with ↓ and ↑ and leaves Home and End to the text', async () => {
      const screen = await render(<PresetSearch />);
      const input = screen.getByRole('combobox');

      await userEvent.click(input);
      await expect.element(input).not.toHaveAttribute('aria-activedescendant');
      await userEvent.keyboard('{ArrowDown}');
      expect(activeOption(input.element())).toBe('Warm pad');
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');
      expect(activeOption(input.element())).toBe('Glass bells');
      await userEvent.keyboard('{Home}{End}');
      expect(activeOption(input.element())).toBe('Glass bells');
      await expect.element(input).toHaveFocus();
    });

    it('selects the highlighted item with Enter, and leaves Enter to the form without one', async () => {
      const onSelect = selectSpy();
      const onSubmit = vi.fn<() => void>();
      const screen = await render(<PresetSearch onSelect={onSelect} onSubmit={onSubmit} />);

      await userEvent.click(screen.getByRole('combobox'));
      // Nothing highlighted: the form is submitted.
      await userEvent.keyboard('{Enter}');
      expect(onSubmit).toHaveBeenCalledOnce();

      await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
      expect(onSelect.mock.calls).toStrictEqual([[{ value: 'glass-bells', item: PRESETS[1] }]]);
      expect(onSubmit).toHaveBeenCalledOnce();
    });

    it('highlights the first match as the user types, with autoHighlight', async () => {
      const screen = await render(<PresetSearch autoHighlight />);
      const input = screen.getByRole('combobox');

      await userEvent.click(input);
      expect(activeOption(input.element())).toBe('Warm pad');
      await userEvent.keyboard('{ArrowDown}');
      expect(activeOption(input.element())).toBe('Glass bells');
      await userEvent.keyboard('new');
      expect(activeOption(input.element())).toBe('New age');
      await userEvent.keyboard('z');
      await expect.element(input).not.toHaveAttribute('aria-activedescendant');
    });

    it('moves the highlight across groups, and reports the value of the selected item', async () => {
      const onSelect = selectSpy();
      const screen = await render(<DocsSearch onSelect={onSelect} />);
      const input = screen.getByRole('combobox', { name: 'Search the docs' });
      const option = (name: string, group: string) =>
        screen.getByRole('group', { name: group }).getByRole('option', { name });

      await userEvent.click(input);
      await userEvent.keyboard('variants');
      expect(screen.getByRole('option').elements()).toHaveLength(2);
      await expect
        .element(input)
        .toHaveAttribute('aria-activedescendant', option('Variants', 'Button').element().id);
      await userEvent.keyboard('{ArrowDown}');
      // On to the first item of the next group.
      await expect
        .element(input)
        .toHaveAttribute('aria-activedescendant', option('Variants', 'Card').element().id);
      await userEvent.keyboard('{Enter}');
      // The value of the item is its URL (`itemToValue`).
      expect(onSelect.mock.calls).toStrictEqual([
        [{ value: '/docs/essentials/card#variants', item: DOCS[4] }],
      ]);
    });

    it('highlights the first item of an input that had focus before the listbox started', async () => {
      const screen = await render(<PresetSearch focusOnMount autoHighlight />);
      const input = screen.getByRole('combobox');

      await expect.element(input).toHaveFocus();
      await expect.poll(() => activeOption(input.element())).toBe('Warm pad');
    });

    it('selects a clicked item and keeps the focus in the input', async () => {
      const onSelect = selectSpy();
      const screen = await render(<PresetSearch onSelect={onSelect} />);
      const input = screen.getByRole('combobox');

      await userEvent.click(input);
      await userEvent.click(screen.getByRole('option', { name: 'Bright lead' }));
      expect(onSelect.mock.calls).toStrictEqual([[{ value: 'bright-lead', item: PRESETS[3] }]]);
      await expect.element(input).toHaveFocus();
      expect(activeOption(input.element())).toBe('Bright lead');
    });

    it('keeps the highlight when the focus moves between the input and the list', async () => {
      const screen = await render(<PresetSearch />);
      const input = screen.getByRole('combobox');
      const list = screen.getByRole('listbox');

      await userEvent.click(input);
      await userEvent.keyboard('{ArrowDown}{ArrowDown}');
      list.element().focus();
      await expect.element(list).toHaveFocus();
      expect(activeOption(list.element())).toBe('Glass bells');
      input.element().focus();
      expect(activeOption(input.element())).toBe('Glass bells');
    });

    it('lets an input method editor finish its text with Enter', async () => {
      const onSelect = selectSpy();
      const screen = await render(<PresetSearch onSelect={onSelect} />);
      const input = screen.getByRole('combobox');

      await userEvent.click(input);
      await userEvent.keyboard('{ArrowDown}');
      input
        .element()
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }),
        );
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('with the pointer', () => {
    it('highlights the item under the pointer, and clears it when the pointer leaves', async () => {
      const screen = await render(<Presets />);
      const list = screen.getByRole('listbox');

      await userEvent.hover(screen.getByRole('option', { name: 'Glass bells' }));
      expect(activeOption(list.element())).toBe('Glass bells✓');
      await userEvent.unhover(list);
      await expect.element(list).not.toHaveAttribute('aria-activedescendant');
    });

    it('keeps the highlight of a focused list when the pointer leaves', async () => {
      const screen = await render(<Presets />);
      const list = screen.getByRole('listbox');

      await userEvent.click(screen.getByRole('option', { name: 'Glass bells' }));
      await expect.element(list).toHaveFocus();
      await userEvent.unhover(list);
      expect(activeOption(list.element())).toBe('Glass bells✓');
    });

    it('leaves the highlight to the keyboard without highlightOnHover', async () => {
      const screen = await render(<Presets highlightOnHover={false} />);
      const list = screen.getByRole('listbox');

      await userEvent.hover(screen.getByRole('option', { name: 'Glass bells' }));
      await expect.element(list).not.toHaveAttribute('aria-activedescendant');
    });

    it('ignores disabled items', async () => {
      const onSelect = selectSpy();
      const screen = await render(<Presets onSelect={onSelect} />);
      const disabled = screen.getByRole('option', { name: 'Deep bass' });

      // Forced: Playwright waits for an `aria-disabled` element to be enabled.
      await userEvent.hover(disabled, { force: true });
      await userEvent.click(disabled, { force: true });
      expect(onSelect).not.toHaveBeenCalled();
      await expect.element(disabled).not.toHaveAttribute('data-highlighted');
    });
  });

  it('ignores the user while disabled', async () => {
    const onSelect = selectSpy();
    const screen = await render(
      <>
        <PresetSearch disabled onSelect={onSelect} />
        <Presets disabled onSelect={onSelect} />
      </>,
    );

    await expect.element(screen.getByRole('combobox')).toBeDisabled();
    const lists = screen.getByRole('listbox').elements();
    for (const list of lists) {
      expect(list).not.toHaveAttribute('tabindex');
      expect(list).toHaveAttribute('aria-disabled', 'true');
    }
    await userEvent.click(screen.getByRole('option', { name: 'Glass bells' }).first(), {
      force: true,
    });
    expect(onSelect).not.toHaveBeenCalled();
    await expect
      .element(screen.getByRole('option', { name: 'Glass bells' }).first())
      .toHaveAttribute('data-disabled', '');
  });

  it('shows a controlled value and reports selections', async () => {
    const onValueChange = vi.fn<(details: listbox.ValueChangeDetails) => void>();
    const screen = await render(<Presets value={['warm-pad']} onValueChange={onValueChange} />);

    await userEvent.click(screen.getByRole('option', { name: 'New age' }));
    expect(onValueChange.mock.calls).toStrictEqual([[{ value: ['new-age'], items: [PRESETS[4]] }]]);
    await expect
      .element(screen.getByRole('option', { name: 'Warm pad' }))
      .toHaveAttribute('aria-selected', 'true');

    await screen.rerender(<Presets value={['new-age']} onValueChange={onValueChange} />);
    await expect
      .element(screen.getByRole('option', { name: 'New age' }))
      .toHaveAttribute('aria-selected', 'true');
  });

  it('toggles the items of a multiple selection with clicks and Enter', async () => {
    const screen = await render(<Effects />);
    await expect
      .element(screen.getByRole('listbox', { name: 'Effects' }))
      .toHaveAttribute('aria-multiselectable', 'true');

    await userEvent.click(screen.getByRole('option', { name: 'Reverb' }));
    // Selected to start with: the click unselects it.
    await userEvent.click(screen.getByRole('option', { name: 'Delay' }));
    await userEvent.keyboard('{Home}{Enter}');
    const selected = screen
      .getByRole('option')
      .elements()
      .filter((option) => option.getAttribute('aria-selected') === 'true')
      .map((option) => option.textContent);
    expect(selected).toStrictEqual(['Chorus ✓', 'Reverb ✓']);
  });

  it('shows Empty only while the collection has no items', async () => {
    const empty: ListCollection<Preset> = createListCollection<Preset>({ items: [] });
    const screen = await render(<Presets />);

    await expect.element(screen.getByText('No presets')).not.toBeInTheDocument();
    await screen.rerender(<Presets collection={empty} />);
    await expect.element(screen.getByText('No presets')).toHaveAttribute('data-part', 'empty');
    expect(part(screen.container, 'content')).toHaveAttribute('data-empty', '');
  });

  it('names each group by its label', async () => {
    const sections = createListCollection({
      items: [
        { value: 'pad', label: 'Pad', section: 'Synth' },
        { value: 'kick', label: 'Kick', section: 'Drums' },
      ],
      groupBy: (item) => item.section,
    });
    const screen = await render(
      <Listbox.Root collection={sections}>
        <Listbox.Content aria-label="Sounds">
          {sections.groups.map((group) => (
            <Listbox.ItemGroup key={group.key}>
              <Listbox.ItemGroupLabel>{group.key}</Listbox.ItemGroupLabel>
              {group.items.map((item) => (
                <Listbox.Item key={item.value} item={item}>
                  {item.label}
                </Listbox.Item>
              ))}
            </Listbox.ItemGroup>
          ))}
          <Listbox.ItemGroup>
            <Listbox.ItemGroupLabel id="more">More</Listbox.ItemGroupLabel>
          </Listbox.ItemGroup>
        </Listbox.Content>
      </Listbox.Root>,
    );

    await expect
      .element(screen.getByRole('group', { name: 'Drums' }).getByRole('option'))
      .toHaveTextContent('Kick');
    await expect
      .element(screen.getByRole('group', { name: 'More' }))
      .toHaveAttribute('aria-labelledby', 'more');
  });

  it('gives parts of your own the API of the root', async () => {
    const screen = await render(
      <Presets selectionMode="multiple">
        <Selection />
      </Presets>,
    );

    await userEvent.click(screen.getByRole('option', { name: 'Warm pad' }));
    await userEvent.click(screen.getByRole('option', { name: 'New age' }));
    await expect.element(screen.getByRole('status')).toHaveTextContent('warm-pad, new-age');
  });

  it('throws when a part is rendered outside of its root or item', () => {
    expect(() => renderToStaticMarkup(<Listbox.Content />)).toThrow(
      'Listbox: render the parts inside <Listbox.Root>.',
    );
    expect(() =>
      renderToStaticMarkup(
        <Listbox.Root collection={presets}>
          <Listbox.ItemText />
        </Listbox.Root>,
      ),
    ).toThrow('Listbox: render the parts of an item inside <Listbox.Item>.');
  });
});

describe('Listbox accessibility', () => {
  it('has no axe violations: Default', async () => {
    const screen = await render(<Waveforms />);
    const option = (name: string) => screen.getByRole('option', { name });

    // Square selected with the keys, then Triangle with a click.
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{End}{Home}ss{Enter}');
    await expect.element(option('Square')).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(option('Triangle'));
    await expect.element(option('Triangle')).toHaveAttribute('aria-selected', 'true');
    await expectNoAxeViolations();
  });

  it('has no axe violations: Search', async () => {
    const screen = await render(<DocsSearch />);
    const input = screen.getByRole('combobox', { name: 'Search the docs' });

    // Two results selected, then a query that finds nothing.
    await userEvent.click(input);
    await userEvent.keyboard('variants');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await userEvent.clear(input);
    await userEvent.keyboard('copy');
    await userEvent.click(screen.getByRole('option', { name: 'Copy' }));
    await userEvent.clear(input);
    await userEvent.keyboard('zzz');
    await expect.element(screen.getByText('No results')).toBeVisible();
    await expectNoAxeViolations();
  });

  it('has no axe violations: Multiple', async () => {
    const screen = await render(<Effects />);

    // Reverb and Chorus selected, Delay unselected.
    await userEvent.click(screen.getByRole('option', { name: 'Reverb' }));
    await userEvent.click(screen.getByRole('option', { name: 'Delay' }));
    await userEvent.keyboard('{Home}{Enter}');
    await expect
      .element(screen.getByRole('option', { name: 'Chorus' }))
      .toHaveAttribute('aria-selected', 'true');
    await expectNoAxeViolations();
  });
});
