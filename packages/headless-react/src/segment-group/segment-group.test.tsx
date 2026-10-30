import type { segmentGroup } from '@contour-ui/core';
import { expectNoAxeViolations } from '@contour-ui/vite-config/visual';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { SegmentGroup, useSegmentGroupContext } from '../index.ts';

const ranges = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

interface RangeProps extends SegmentGroup.RootProps {
  readonly disabledValue?: string;
}

/** A labelled group of three ranges, with an indicator. */
function Range({ disabledValue, ...props }: RangeProps): ReactElement {
  return (
    <SegmentGroup.Root style={{ position: 'relative', display: 'flex' }} {...props}>
      <SegmentGroup.Label>Range</SegmentGroup.Label>
      <SegmentGroup.Indicator
        style={{
          position: 'absolute',
          left: 'var(--left)',
          top: 'var(--top)',
          width: 'var(--width)',
          height: 'var(--height)',
        }}
      />
      {ranges.map((range) => (
        <SegmentGroup.Item
          key={range.value}
          value={range.value}
          disabled={range.value === disabledValue}
          style={{ padding: '4px 12px' }}
        >
          <SegmentGroup.ItemText>{range.label}</SegmentGroup.ItemText>
          <SegmentGroup.ItemControl />
          <SegmentGroup.ItemHiddenInput />
        </SegmentGroup.Item>
      ))}
    </SegmentGroup.Root>
  );
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

/** Whether two elements cover the same box, to a pixel. */
function sameBox(a: Element, b: Element): boolean {
  const first = a.getBoundingClientRect();
  const second = b.getBoundingClientRect();
  return (['left', 'top', 'width', 'height'] as const).every(
    (side) => Math.abs(first[side] - second[side]) < 1,
  );
}

/** A group whose owner keeps the value, with a button that clears it. */
function Controlled(): ReactElement {
  const [value, setValue] = useState<string | null>('day');
  return (
    <>
      <Range
        value={value}
        onValueChange={(details) => {
          setValue(details.value);
        }}
      />
      <button
        type="button"
        onClick={() => {
          setValue(null);
        }}
      >
        Clear
      </button>
    </>
  );
}

/** A button of its own that sets the value through the context. */
function MonthButton(): ReactElement {
  const api = useSegmentGroupContext();
  return (
    <button
      type="button"
      onClick={() => {
        api.setValue('month');
      }}
    >
      Month please
    </button>
  );
}

/** The form of a render. */
function formOf(container: HTMLElement): HTMLFormElement {
  const form = container.querySelector('form');
  if (form === null) {
    throw new Error('No form.');
  }
  return form;
}

const valueSpy = () => vi.fn<(details: segmentGroup.ValueChangeDetails) => void>();

/**
 * The examples' own styles: just enough to see the items, the focus ring and the indicator, by
 * the data attributes of the parts.
 */
const css = `
  [data-scope='segment-group'][data-part='root'] {
    position: relative; display: inline-flex; align-items: center; gap: 2px;
    border: 1px solid; padding: 2px;
  }
  [data-scope='segment-group'][data-part='root'][data-orientation='vertical'] {
    flex-direction: column; align-items: stretch;
  }
  [data-scope='segment-group'][data-part='label'] { padding-inline: 6px; }
  [data-scope='segment-group'][data-part='item'] { position: relative; padding: 2px 10px; }
  [data-scope='segment-group'][data-part='item'][data-state='checked'] { font-weight: bold; }
  [data-scope='segment-group'][data-part='item'][data-disabled] { color: #6b6b6b; }
  [data-scope='segment-group'][data-part='item'][data-focus-visible] { outline: 2px solid; }
  [data-scope='segment-group'][data-part='indicator'] {
    position: absolute; left: var(--left); top: var(--top);
    width: var(--width); height: var(--height);
    background: #d6d6d6; transition: left 150ms, top 150ms, width 150ms;
  }
`;

/** The ranges of a report: the last one is disabled. */
const REPORT_RANGES = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year', disabled: true },
];

/** The ranges of a report, as items with their text and native radio button. */
function ReportRanges(): ReactElement {
  return (
    <>
      {REPORT_RANGES.map((range) => (
        <SegmentGroup.Item key={range.value} value={range.value} disabled={range.disabled}>
          <SegmentGroup.ItemText>{range.label}</SegmentGroup.ItemText>
          <SegmentGroup.ItemHiddenInput />
        </SegmentGroup.Item>
      ))}
    </>
  );
}

/** The props of the icons of the examples, hidden from assistive technology. */
const glyph = {
  'aria-hidden': true,
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
} as const;

describe('SegmentGroup', () => {
  it('renders a labelled radio group of native radio buttons', async () => {
    const screen = await render(<Range defaultValue="week" />);
    const group = screen.getByRole('radiogroup', { name: 'Range' });

    await expect.element(group).toHaveAttribute('aria-orientation', 'horizontal');
    await expect.element(group).toHaveAttribute('data-orientation', 'horizontal');
    await expect.element(group).not.toHaveAttribute('data-disabled');
    await expect.element(screen.getByRole('radio', { name: 'Week' })).toBeChecked();
    await expect.element(screen.getByRole('radio', { name: 'Day' })).not.toBeChecked();

    const week = part(screen.container, 'item', 'week');
    expect(week.tagName).toBe('LABEL');
    expect(week).toHaveAttribute('data-state', 'checked');
    expect(part(screen.container, 'item', 'day')).toHaveAttribute('data-state', 'unchecked');
    expect(part(screen.container, 'item-text', 'week')).toHaveAttribute('data-state', 'checked');
    expect(part(screen.container, 'item-control', 'week')).toHaveAttribute('aria-hidden', 'true');
    const inputs = screen.container.querySelectorAll('input');
    expect(new Set([...inputs].map((input) => input.name)).size).toBe(1);
    expect(inputs[0]?.name).not.toBe('');
  });

  it('checks an item on click and reports the value', async () => {
    const onValueChange = valueSpy();
    const screen = await render(<Range defaultValue="day" onValueChange={onValueChange} />);

    await userEvent.click(screen.getByText('Month'));
    await expect.element(screen.getByRole('radio', { name: 'Month' })).toBeChecked();
    expect(part(screen.container, 'item', 'month')).toHaveAttribute('data-state', 'checked');
    expect(onValueChange.mock.calls).toStrictEqual([[{ value: 'month' }]]);
  });

  it('moves the check with the arrow keys and skips a disabled item', async () => {
    const onValueChange = valueSpy();
    const screen = await render(
      <>
        <button type="button">Before</button>
        <Range defaultValue="day" disabledValue="week" onValueChange={onValueChange} />
      </>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Before' }));
    await userEvent.keyboard('{Tab}');
    const day = screen.getByRole('radio', { name: 'Day' });
    await expect.element(day).toHaveFocus();
    expect(part(screen.container, 'item', 'day')).toHaveAttribute('data-focus-visible', '');

    await userEvent.keyboard('{ArrowRight}');
    const month = screen.getByRole('radio', { name: 'Month' });
    await expect.element(month).toHaveFocus();
    await expect.element(month).toBeChecked();
    expect(part(screen.container, 'item', 'month')).toHaveAttribute('data-focus-visible', '');
    expect(part(screen.container, 'item', 'day')).not.toHaveAttribute('data-focus');
    expect(part(screen.container, 'item', 'week')).toHaveAttribute('data-disabled', '');

    await userEvent.keyboard('{ArrowLeft}');
    await expect.element(day).toBeChecked();
    expect(onValueChange.mock.calls).toStrictEqual([[{ value: 'month' }], [{ value: 'day' }]]);

    await userEvent.keyboard('{Tab}');
    expect(part(screen.container, 'item', 'day')).not.toHaveAttribute('data-focus');
  });

  it('wraps around with the arrow keys, past a disabled last item', async () => {
    const screen = await render(
      <SegmentGroup.Root aria-label="Range" defaultValue="month">
        <ReportRanges />
      </SegmentGroup.Root>,
    );
    const day = screen.getByRole('radio', { name: 'Day' });

    await userEvent.click(screen.getByText('Month'));
    await userEvent.keyboard('{ArrowRight}');
    // Year is disabled: the check wraps around to Day.
    await expect.element(day).toBeChecked();
    await expect.element(day).toHaveFocus();
    await expect.element(screen.getByRole('radio', { name: 'Year' })).toBeDisabled();
  });

  it('moves the check with the arrow keys of the block axis in a vertical group', async () => {
    const screen = await render(
      <SegmentGroup.Root aria-label="Range" defaultValue="day" orientation="vertical">
        <ReportRanges />
      </SegmentGroup.Root>,
    );

    await userEvent.click(screen.getByText('Day'));
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(screen.getByRole('radio', { name: 'Week' })).toBeChecked();
  });

  it('submits the value under its name with the form', async () => {
    const screen = await render(
      <form>
        <Range name="range" defaultValue="week" />
      </form>,
    );
    const form = formOf(screen.container);
    expect(new FormData(form).get('range')).toBe('week');

    await userEvent.click(screen.getByText('Day'));
    expect(new FormData(form).get('range')).toBe('day');
  });

  it('belongs to the form it names', async () => {
    const screen = await render(
      <>
        <form id="settings" />
        <Range name="range" form="settings" defaultValue="month" />
      </>,
    );
    const form = formOf(screen.container);
    expect(new FormData(form).get('range')).toBe('month');
  });

  it('follows a controlled value', async () => {
    const screen = await render(<Controlled />);

    await userEvent.click(screen.getByText('Week'));
    await expect.element(screen.getByRole('radio', { name: 'Week' })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    await expect.element(screen.getByRole('radio', { name: 'Day' })).not.toBeChecked();
    expect(screen.container.querySelectorAll('input:checked')).toHaveLength(0);
    expect(part(screen.container, 'indicator')).toHaveAttribute('hidden');
  });

  it('keeps the value of a read-only group', async () => {
    const onValueChange = valueSpy();
    const screen = await render(
      <Range defaultValue="day" readOnly onValueChange={onValueChange} />,
    );
    const group = screen.getByRole('radiogroup', { name: 'Range' });
    await expect.element(group).toHaveAttribute('aria-readonly', 'true');

    await userEvent.click(screen.getByText('Week'));
    await expect.element(screen.getByRole('radio', { name: 'Day' })).toBeChecked();
    await expect.element(screen.getByRole('radio', { name: 'Week' })).not.toBeChecked();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('disables every radio button of a disabled group', async () => {
    const screen = await render(<Range defaultValue="day" disabled orientation="vertical" />);
    const group = screen.getByRole('radiogroup', { name: 'Range' });

    await expect.element(group).toHaveAttribute('aria-disabled', 'true');
    await expect.element(group).toHaveAttribute('aria-orientation', 'vertical');
    await expect.element(group).toHaveAttribute('data-disabled', '');
    expect(screen.container.querySelectorAll('input:disabled')).toHaveLength(ranges.length);
  });

  it('places the indicator on the checked item', async () => {
    const screen = await render(<Range defaultValue="week" />);
    const indicator = part(screen.container, 'indicator');
    const week = part(screen.container, 'item', 'week');

    expect(indicator).not.toHaveAttribute('hidden');
    expect(indicator).toHaveAttribute('aria-hidden', 'true');
    await expect.poll(() => sameBox(indicator, week)).toBe(true);

    await userEvent.click(screen.getByText('Month'));
    const month = part(screen.container, 'item', 'month');
    await expect.poll(() => sameBox(indicator, month)).toBe(true);
  });

  it('follows a label id of the owner', async () => {
    const screen = await render(
      <SegmentGroup.Root>
        <SegmentGroup.Label id="own-label">Theme</SegmentGroup.Label>
      </SegmentGroup.Root>,
    );
    await expect
      .element(screen.getByRole('radiogroup', { name: 'Theme' }))
      .toHaveAttribute('aria-labelledby', 'own-label');
  });

  it('names icon-only items through their hidden input', async () => {
    const screen = await render(
      <SegmentGroup.Root aria-label="Theme" defaultValue="dark">
        <SegmentGroup.Item value="dark">
          <svg aria-hidden="true" />
          <SegmentGroup.ItemHiddenInput aria-label="Dark" />
        </SegmentGroup.Item>
      </SegmentGroup.Root>,
    );
    await expect.element(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
  });

  it('sets the value from code through the context', async () => {
    const screen = await render(
      <SegmentGroup.Root aria-label="Range" defaultValue="day" readOnly>
        <SegmentGroup.Item value="month">
          <SegmentGroup.ItemText>Month</SegmentGroup.ItemText>
          <SegmentGroup.ItemHiddenInput />
        </SegmentGroup.Item>
        <MonthButton />
      </SegmentGroup.Root>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Month please' }));
    await expect.element(screen.getByRole('radio', { name: 'Month' })).toBeChecked();
  });

  it('throws for parts outside of a root', () => {
    expect(() => renderToStaticMarkup(<SegmentGroup.Label>Lost</SegmentGroup.Label>)).toThrow(
      /SegmentGroup\.Root/u,
    );
  });
});

describe('SegmentGroup accessibility', () => {
  it('has no axe violations: Default', async () => {
    const screen = await render(
      <>
        <style>{css}</style>
        <SegmentGroup.Root defaultValue="week">
          <SegmentGroup.Label>Range</SegmentGroup.Label>
          <SegmentGroup.Indicator />
          <ReportRanges />
        </SegmentGroup.Root>
      </>,
    );

    // Day checked with a click, then with the arrow keys, which wrap around past Year.
    await userEvent.click(screen.getByText('Day'));
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(screen.getByRole('radio', { name: 'Week' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    await expect.element(screen.getByRole('radio', { name: 'Day' })).toBeChecked();
    await expectNoAxeViolations();
  });

  it('has no axe violations: Vertical', async () => {
    const screen = await render(
      <>
        <style>{css}</style>
        <SegmentGroup.Root defaultValue="day" orientation="vertical" aria-label="Range">
          <SegmentGroup.Indicator />
          <ReportRanges />
        </SegmentGroup.Root>
      </>,
    );

    await userEvent.click(screen.getByText('Day'));
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(screen.getByRole('radio', { name: 'Week' })).toBeChecked();
    await expectNoAxeViolations();
  });

  it('has no axe violations: IconOnly', async () => {
    const screen = await render(
      <>
        <style>{css}</style>
        <SegmentGroup.Root defaultValue="system" aria-label="Theme">
          <SegmentGroup.Indicator />
          <SegmentGroup.Item value="light">
            <svg {...glyph}>
              <circle cx="8" cy="8" r="3" />
            </svg>
            <SegmentGroup.ItemHiddenInput aria-label="Light" />
          </SegmentGroup.Item>
          <SegmentGroup.Item value="dark">
            <svg {...glyph}>
              <path d="M12 10a5 5 0 0 1-6-6 5 5 0 1 0 6 6Z" />
            </svg>
            <SegmentGroup.ItemHiddenInput aria-label="Dark" />
          </SegmentGroup.Item>
          <SegmentGroup.Item value="system">
            <svg {...glyph}>
              <rect x="2" y="3" width="12" height="8" rx="1" />
              <path d="M6 14h4" />
            </svg>
            <SegmentGroup.ItemHiddenInput aria-label="System" />
          </SegmentGroup.Item>
        </SegmentGroup.Root>
      </>,
    );

    // Through the item: the icon covers the hidden radio button.
    await userEvent.click(part(screen.container, 'item', 'dark'));
    await expect.element(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    await expectNoAxeViolations();
  });

  it('has no axe violations: InForm', async () => {
    const screen = await render(
      <form aria-label="Report">
        <style>{css}</style>
        <SegmentGroup.Root name="range" defaultValue="month" aria-label="Range">
          <ReportRanges />
        </SegmentGroup.Root>
      </form>,
    );

    await userEvent.click(screen.getByText('Day'));
    await expect.poll(() => new FormData(formOf(screen.container)).get('range')).toBe('day');
    await expectNoAxeViolations();
  });

  it('has no axe violations: Disabled', async () => {
    const screen = await render(
      <>
        <style>{css}</style>
        <SegmentGroup.Root defaultValue="week" disabled aria-label="Range">
          <SegmentGroup.Indicator />
          <ReportRanges />
        </SegmentGroup.Root>
      </>,
    );

    await expect.element(screen.getByRole('radio', { name: 'Week' })).toBeDisabled();
    await expectNoAxeViolations();
  });
});
