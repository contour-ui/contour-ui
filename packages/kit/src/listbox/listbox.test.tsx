import { vars } from '@contour-ui/tokens';
import { createRef } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { createListCollection, Listbox } from '../index.ts';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';

/** Computed value of `property` when set to `value` (resolves `var(--ct-…)`). */
function computed(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const result = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return result;
}

/** A length token in px. Border and outline widths compute to 0 without a style, so read padding. */
const length = (value: string): string => computed('padding-top', value);

interface Sound {
  readonly value: string;
  readonly label: string;
  readonly section: string;
  readonly disabled?: boolean;
}

const sounds = createListCollection<Sound>({
  items: [
    { value: 'pad', label: 'Warm pad', section: 'Synth' },
    { value: 'lead', label: 'Bright lead', section: 'Synth', disabled: true },
    { value: 'kick', label: 'Kick', section: 'Drums' },
  ],
  groupBy: (sound) => sound.section,
});

/** Every part, with Kick selected and Warm pad highlighted. */
function Sounds(props: Partial<Listbox.RootProps<Sound>>): ReactElement {
  return (
    <Listbox.Root
      collection={sounds}
      defaultValue={['kick']}
      defaultHighlightedValue="pad"
      {...props}
    >
      <Listbox.Label>Sound</Listbox.Label>
      <Listbox.Input placeholder="Filter" />
      <Listbox.Content>
        {sounds.groups.map((group) => (
          <Listbox.ItemGroup key={group.key}>
            <Listbox.ItemGroupLabel>{group.key}</Listbox.ItemGroupLabel>
            {group.items.map((item) => (
              <Listbox.Item key={item.value} item={item}>
                <Listbox.ItemText>{item.label}</Listbox.ItemText>
                <Listbox.ItemIndicator />
              </Listbox.Item>
            ))}
          </Listbox.ItemGroup>
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
}

/** The element of a listbox part. */
function part(container: Element, name: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(
    `[data-scope="listbox"][data-part="${name}"]`,
  );
  if (element === null) {
    throw new Error(`No listbox ${name}.`);
  }
  return element;
}

describe('Listbox', () => {
  it('renders each part as its element with its class and data attributes', async () => {
    const screen = await render(<Sounds />);
    const parts = [
      ['root', 'DIV', 'contour-listbox'],
      ['label', 'LABEL', 'contour-listbox__label'],
      ['input', 'INPUT', 'contour-listbox__input'],
      ['content', 'DIV', 'contour-listbox__content'],
      ['item-group', 'DIV', 'contour-listbox__item-group'],
      ['item-group-label', 'DIV', 'contour-listbox__item-group-label'],
      ['item', 'DIV', 'contour-listbox__item'],
      ['item-text', 'SPAN', 'contour-listbox__item-text'],
      ['item-indicator', 'SPAN', 'contour-listbox__item-indicator'],
    ] as const;

    for (const [name, tagName, className] of parts) {
      const element = part(screen.container, name);
      expect(element.tagName).toBe(tagName);
      expect(element).toHaveClass(className, { exact: true });
    }
    await expect.element(screen.getByRole('listbox', { name: 'Sound' })).toBeInTheDocument();
    // The indicator is a check mark icon.
    expect(part(screen.container, 'item-indicator').querySelector('svg')).toHaveClass(
      'contour-icon',
    );
  });

  it('is styled with semantic tokens', async () => {
    const screen = await render(<Sounds />);
    const highlighted = screen.getByRole('option', { name: 'Warm pad' });
    const kick = screen.getByRole('option', { name: 'Kick' });

    await expect.element(highlighted).toHaveStyle({
      backgroundColor: computed('background-color', vars.color.bg.hover),
      color: computed('color', vars.color.fg.default),
      borderTopLeftRadius: length(vars.radius.control),
      paddingTop: length(vars.space['control-gap']),
      paddingLeft: length(vars.space['control-inset']),
      minHeight: length(vars.size['control-md']),
      cursor: 'pointer',
    });
    await expect.element(kick).toHaveStyle({ backgroundColor: 'rgba(0, 0, 0, 0)' });
    await expect
      .element(screen.getByRole('option', { name: 'Bright lead' }))
      .toHaveStyle({ color: computed('color', vars.color.fg.disabled), cursor: 'not-allowed' });

    const indicator = part(kick.element(), 'item-indicator');
    expect(indicator).toBeVisible();
    expect(indicator).toHaveStyle({ color: computed('color', vars.color.accent.fg) });
    expect(indicator.querySelector('svg')).toHaveStyle({
      width: length(vars.size['icon-sm']),
      height: length(vars.size['icon-sm']),
    });

    expect(part(screen.container, 'item-group-label')).toHaveStyle({
      color: computed('color', vars.color.fg.muted),
      fontSize: computed('font-size', vars.text.caption.fontSize),
    });
    expect(part(screen.container, 'label')).toHaveStyle({
      fontSize: computed('font-size', vars.text.label.fontSize),
      fontWeight: computed('font-weight', vars.text.label.fontWeight),
    });
  });

  it('keeps the room of the indicator of an item that is not selected', async () => {
    const screen = await render(<Sounds />);
    const pad = screen.getByRole('option', { name: 'Warm pad' }).element();
    const indicator = part(pad, 'item-indicator');

    expect(indicator).toHaveAttribute('hidden');
    expect(indicator).not.toBeVisible();
    expect(`${indicator.getBoundingClientRect().width}px`).toBe(length(vars.size['icon-sm']));
    // The texts of all rows end at the same place.
    const texts = [...screen.container.querySelectorAll('.contour-listbox__item-text')];
    expect(new Set(texts.map((text) => text.getBoundingClientRect().right)).size).toBe(1);
  });

  it('styles the input as a text field with a focus ring on its border', async () => {
    const screen = await render(<Sounds />);
    const input = screen.getByRole('combobox', { name: 'Sound' });
    // The pointer stays where earlier tests on the page left it; over the field or its label, it
    // would turn the border to its hover color.
    await userEvent.unhover(input);

    await expect.element(input).toHaveStyle({
      height: length(vars.size['control-md']),
      paddingLeft: length(vars.space['control-inset']),
      borderTopStyle: 'solid',
      borderTopColor: computed('border-top-color', vars.color.border.default),
      borderTopLeftRadius: length(vars.radius.control),
      backgroundColor: 'rgba(0, 0, 0, 0)',
      color: computed('color', vars.color.fg.default),
      fontSize: computed('font-size', vars.text.body.fontSize),
    });
    await userEvent.tab();
    await expect.element(input).toHaveFocus();
    await expect.element(input).toHaveStyle({
      outlineStyle: 'solid',
      outlineColor: computed('outline-color', vars.color.border.focus),
      outlineWidth: length(vars['border-width'].focus),
      outlineOffset: `-${length(vars['border-width'].default)}`,
    });
  });

  it('shows a focus ring on a list that takes the keys itself', async () => {
    const screen = await render(
      <Listbox.Root collection={sounds}>
        <Listbox.Content aria-label="Sounds" />
      </Listbox.Root>,
    );
    const list = screen.getByRole('listbox');

    await userEvent.tab();
    await expect.element(list).toHaveFocus();
    await expect.element(list).toHaveStyle({
      outlineStyle: 'solid',
      outlineColor: computed('outline-color', vars.color.border.focus),
      outlineOffset: length(vars['border-width'].focus),
    });
  });

  it('lays a horizontal list out in a row', async () => {
    const steps = createListCollection({ items: ['1/4', '1/8', '1/16'] });
    const screen = await render(
      <Listbox.Root collection={steps} orientation="horizontal">
        <Listbox.Content aria-label="Grid">
          {steps.items.map((step) => (
            <Listbox.Item key={step} item={step}>
              {step}
            </Listbox.Item>
          ))}
        </Listbox.Content>
      </Listbox.Root>,
    );
    const [first, second] = screen
      .getByRole('option')
      .elements()
      .map((option) => option.getBoundingClientRect());

    expect(part(screen.container, 'content')).toHaveStyle({ flexDirection: 'row' });
    expect(second?.top).toBe(first?.top);
    expect(second?.left).toBe(first?.right);
  });

  it('shows Empty in muted text', async () => {
    const screen = await render(
      <Listbox.Root collection={createListCollection<string>({ items: [] })}>
        <Listbox.Content aria-label="Results" />
        <Listbox.Empty>No results</Listbox.Empty>
      </Listbox.Root>,
    );

    await expect.element(screen.getByText('No results')).toHaveClass('contour-listbox__empty');
    await expect.element(screen.getByText('No results')).toHaveStyle({
      color: computed('color', vars.color.fg.muted),
      paddingLeft: length(vars.space['control-inset']),
    });
  });

  it('takes a mark of its own for the indicator', async () => {
    const one = createListCollection({ items: ['Kick'] });
    const screen = await render(
      <Listbox.Root collection={one} defaultValue={['Kick']}>
        <Listbox.Content aria-label="Sounds">
          <Listbox.Item item="Kick">
            <Listbox.ItemText>Kick</Listbox.ItemText>
            <Listbox.ItemIndicator>•</Listbox.ItemIndicator>
          </Listbox.Item>
        </Listbox.Content>
      </Listbox.Root>,
    );

    await expect.element(screen.getByText('•')).toHaveClass('contour-listbox__item-indicator');
    expect(screen.container.querySelector('svg')).toBeNull();
  });

  it('passes class names, props and the ref through to the root', async () => {
    const ref = createRef<HTMLDivElement>();
    await render(<Sounds ref={ref} className="mine" aria-describedby="hint" />);

    expect(ref.current).toHaveClass('contour-listbox mine', { exact: true });
    expect(ref.current).toHaveAttribute('aria-describedby', 'hint');
    expect(ref.current).toHaveAttribute('data-orientation', 'vertical');
  });
});
