import type { segmentGroup } from '@contour-ui/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactElement } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';

import { SegmentGroup } from '../index.ts';

/**
 * Headless renders no CSS: just enough here to see the items, the focus ring and the indicator,
 * by the data attributes of the parts.
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

/** Reports the changes of the stories, as an app would act on them. */
const onValueChange =
  fn<(details: segmentGroup.ValueChangeDetails) => void>().mockName('onValueChange');

const meta: Meta<typeof SegmentGroup.Root> = {
  title: 'Headless/SegmentGroup',
  component: SegmentGroup.Root,
  tags: ['autodocs'],
  args: { onValueChange },
  beforeEach: () => {
    onValueChange.mockClear();
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

const RANGES = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year', disabled: true },
];

/** The ranges of the stories, as items with their text and native radio button. */
function Ranges(): ReactElement {
  return (
    <>
      {RANGES.map((range) => (
        <SegmentGroup.Item key={range.value} value={range.value} disabled={range.disabled}>
          <SegmentGroup.ItemText>{range.label}</SegmentGroup.ItemText>
          <SegmentGroup.ItemHiddenInput />
        </SegmentGroup.Item>
      ))}
    </>
  );
}

/**
 * A labelled group whose indicator follows the checked item. A click checks an item; Tab
 * reaches the checked one, and the arrow keys move the check, skipping the disabled "Year".
 */
export const Default: Story = {
  args: { defaultValue: 'week' },
  render: (args) => (
    <>
      <style>{css}</style>
      <SegmentGroup.Root {...args}>
        <SegmentGroup.Label>Range</SegmentGroup.Label>
        <SegmentGroup.Indicator />
        <Ranges />
      </SegmentGroup.Root>
    </>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radiogroup', { name: 'Range' })).toBeInTheDocument();
    await userEvent.click(canvas.getByText('Day'));
    await expect(canvas.getByRole('radio', { name: 'Day' })).toBeChecked();
    await expect(onValueChange).toHaveBeenLastCalledWith({ value: 'day' });

    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('radio', { name: 'Week' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    // "Year" is disabled: the check wraps around to "Day".
    await expect(canvas.getByRole('radio', { name: 'Day' })).toBeChecked();
    await expect(canvas.getByRole('radio', { name: 'Year' })).toBeDisabled();
  },
};

/** A vertical group: the arrow keys of both axes move the check, as with native radios. */
export const Vertical: Story = {
  args: { defaultValue: 'day', orientation: 'vertical', 'aria-label': 'Range' },
  render: (args) => (
    <>
      <style>{css}</style>
      <SegmentGroup.Root {...args}>
        <SegmentGroup.Indicator />
        <Ranges />
      </SegmentGroup.Root>
    </>
  ),
  play: async ({ canvas }) => {
    const group = canvas.getByRole('radiogroup', { name: 'Range' });
    await expect(group).toHaveAttribute('aria-orientation', 'vertical');
    await userEvent.click(canvas.getByText('Day'));
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('radio', { name: 'Week' })).toBeChecked();
  },
};

const glyph = {
  'aria-hidden': true,
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
} as const;

/**
 * Items that show only an icon: each native radio button takes its name from `aria-label`, so
 * screen readers announce "Light", "Dark" and "System".
 */
export const IconOnly: Story = {
  args: { defaultValue: 'system', 'aria-label': 'Theme' },
  render: (args) => (
    <>
      <style>{css}</style>
      <SegmentGroup.Root {...args}>
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
    </>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: 'System' })).toBeChecked();
    await userEvent.click(canvas.getByRole('radio', { name: 'Dark' }));
    await expect(onValueChange).toHaveBeenLastCalledWith({ value: 'dark' });
  },
};

/** A group in a form: the checked value is submitted under `name`. */
export const InForm: Story = {
  args: { name: 'range', defaultValue: 'month', 'aria-label': 'Range' },
  render: (args) => (
    <form aria-label="Report">
      <style>{css}</style>
      <SegmentGroup.Root {...args}>
        <Ranges />
      </SegmentGroup.Root>
    </form>
  ),
  play: async ({ canvas }) => {
    const form = canvas.getByRole('form', { name: 'Report' });
    if (!(form instanceof HTMLFormElement)) {
      throw new TypeError('No form.');
    }
    await expect(new FormData(form).get('range')).toBe('month');
    await userEvent.click(canvas.getByText('Day'));
    await waitFor(async () => {
      await expect(new FormData(form).get('range')).toBe('day');
    });
  },
};

/** A disabled group: no item takes focus or a check. */
export const Disabled: Story = {
  args: { defaultValue: 'week', disabled: true, 'aria-label': 'Range' },
  render: (args) => (
    <>
      <style>{css}</style>
      <SegmentGroup.Root {...args}>
        <SegmentGroup.Indicator />
        <Ranges />
      </SegmentGroup.Root>
    </>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getAllByRole('radio').filter((radio) => !radio.matches(':disabled')),
    ).toStrictEqual([]);
  },
};
