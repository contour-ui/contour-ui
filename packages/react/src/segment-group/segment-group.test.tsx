import { moonIcon, sunIcon } from '@contour-ui/icons';
import { vars } from '@contour-ui/tokens';
import { describe, expect, it } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Icon, SegmentGroup } from '../index.ts';

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

/** The element of a part, by its value for the parts of an item. */
function part(container: HTMLElement, name: string, value?: string): HTMLElement {
  const byValue = value === undefined ? '' : `[data-value="${value}"]`;
  const element = container.querySelector<HTMLElement>(
    `[data-scope="segment-group"][data-part="${name}"]${byValue}`,
  );
  if (element === null) {
    throw new Error(`No segment group ${name}.`);
  }
  return element;
}

/** The `<svg>` of the icon inside `element`. */
function iconOf(element: Element): SVGSVGElement {
  const svg = element.querySelector('svg');
  if (svg === null) {
    throw new Error('No icon inside the element.');
  }
  return svg;
}

/** Whether two elements cover the same box, to a pixel. */
function sameBox(a: Element, b: Element): boolean {
  const first = a.getBoundingClientRect();
  const second = b.getBoundingClientRect();
  return (['left', 'top', 'width', 'height'] as const).every(
    (side) => Math.abs(first[side] - second[side]) < 1,
  );
}

const sizes = [
  ['sm', vars.size['control-sm']],
  ['md', vars.size['control-md']],
  ['lg', vars.size['control-lg']],
] as const;

describe('SegmentGroup', () => {
  it('renders the classes, the resolved size and a control-high track', async () => {
    const screen = await render(
      <>
        {sizes.map(([size]) => (
          <SegmentGroup.Root key={size} size={size} aria-label={size} defaultValue="day">
            <SegmentGroup.Indicator />
            <SegmentGroup.Item value="day">
              <SegmentGroup.ItemText>Day</SegmentGroup.ItemText>
              <SegmentGroup.ItemControl />
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          </SegmentGroup.Root>
        ))}
        <SegmentGroup.Root aria-label="default" />
      </>,
    );
    for (const [size, token] of sizes) {
      const group = screen.getByRole('radiogroup', { name: size }).element();
      expect(group).toHaveClass('contour-segment-group');
      expect(group).toHaveAttribute('data-size', size);
      expect(getComputedStyle(group).blockSize).toBe(computed('block-size', token));
    }
    expect(screen.getByRole('radiogroup', { name: 'default' }).element()).toHaveAttribute(
      'data-size',
      'md',
    );
    const { container } = screen;
    expect(part(container, 'item', 'day')).toHaveClass('contour-segment-group__item');
    expect(part(container, 'item-text', 'day')).toHaveClass('contour-segment-group__item-text');
    expect(part(container, 'item-control', 'day')).toHaveClass(
      'contour-segment-group__item-control',
    );
    expect(container.querySelector('input[value="day"]')).toHaveClass(
      'contour-segment-group__item-hidden-input',
    );
    expect(part(container, 'indicator')).toHaveClass('contour-segment-group__indicator');
  });

  it('raises the checked item on a bordered indicator, not only by color', async () => {
    const screen = await render(
      <SegmentGroup.Root aria-label="Range" defaultValue="day">
        <SegmentGroup.Indicator />
        <SegmentGroup.Item value="day">
          <SegmentGroup.ItemText>Day</SegmentGroup.ItemText>
          <SegmentGroup.ItemHiddenInput />
        </SegmentGroup.Item>
        <SegmentGroup.Item value="week">
          <SegmentGroup.ItemText>Week</SegmentGroup.ItemText>
          <SegmentGroup.ItemHiddenInput />
        </SegmentGroup.Item>
      </SegmentGroup.Root>,
    );
    const indicator = part(screen.container, 'indicator');
    const day = part(screen.container, 'item', 'day');
    const week = part(screen.container, 'item', 'week');
    await userEvent.unhover(week);

    const style = getComputedStyle(indicator);
    expect(style.borderTopColor).toBe(computed('color', vars.color.border.strong));
    expect(style.backgroundColor).toBe(computed('background-color', vars.color.bg.raised));
    expect(getComputedStyle(day).color).toBe(computed('color', vars.color.fg.default));
    expect(getComputedStyle(week).color).toBe(computed('color', vars.color.fg.muted));
    await expect.poll(() => sameBox(indicator, day)).toBe(true);

    await userEvent.click(screen.getByText('Week'));
    await expect.element(screen.getByRole('radio', { name: 'Week' })).toBeChecked();
    await expect.poll(() => sameBox(indicator, week)).toBe(true);
  });

  it('makes icon-only items square and names them through their radio buttons', async () => {
    const screen = await render(
      <SegmentGroup.Root aria-label="Theme" defaultValue="dark">
        <SegmentGroup.Indicator />
        <SegmentGroup.Item value="light">
          <Icon icon={sunIcon} />
          <SegmentGroup.ItemHiddenInput aria-label="Light" />
        </SegmentGroup.Item>
        <SegmentGroup.Item value="dark">
          <Icon icon={moonIcon} />
          <SegmentGroup.ItemHiddenInput aria-label="Dark" />
        </SegmentGroup.Item>
      </SegmentGroup.Root>,
    );
    await expect.element(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    const light = part(screen.container, 'item', 'light').getBoundingClientRect();
    expect(light.width).toBeCloseTo(light.height, 0);
    expect(getComputedStyle(iconOf(part(screen.container, 'item', 'light'))).inlineSize).toBe(
      computed('inline-size', vars.size['icon-sm']),
    );

    // Through the item, its label: the icon covers the hidden radio button.
    await userEvent.click(part(screen.container, 'item', 'light'));
    await expect.element(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    await expect.element(screen.getByRole('radio', { name: 'Dark' })).not.toBeChecked();
  });

  it('shows a focus ring on an item reached by keyboard', async () => {
    const screen = await render(
      <>
        <button type="button">Before</button>
        <SegmentGroup.Root aria-label="Range" defaultValue="day">
          <SegmentGroup.Item value="day">
            <SegmentGroup.ItemText>Day</SegmentGroup.ItemText>
            <SegmentGroup.ItemHiddenInput />
          </SegmentGroup.Item>
        </SegmentGroup.Root>
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Before' }));
    await userEvent.keyboard('{Tab}');
    const day = part(screen.container, 'item', 'day');
    await expect.poll(() => Object.hasOwn(day.dataset, 'focusVisible')).toBe(true);
    expect(getComputedStyle(day).outlineColor).toBe(computed('color', vars.color.border.focus));
  });
});
