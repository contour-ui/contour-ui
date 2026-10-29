import { monitorIcon, moonIcon, sunIcon } from '@contour-ui/icons';
import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactElement } from 'react';
import { expect, userEvent } from 'storybook/test';

import { Icon, SegmentGroup } from '../index.ts';

const meta: Meta<typeof SegmentGroup.Root> = {
  title: 'Kit/SegmentGroup',
  component: SegmentGroup.Root,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

const sizes = ['sm', 'md', 'lg'] as const satisfies ReadonlyArray<SegmentGroup.RootProps['size']>;

const caption: CSSProperties = {
  font: vars.text.caption.font,
  letterSpacing: vars.text.caption.letterSpacing,
  color: vars.color.fg.muted,
};

const RANGES = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

/** Day, week and month, as text items. */
function Ranges({ disabledValue }: { readonly disabledValue?: string }): ReactElement {
  return (
    <>
      {RANGES.map((range) => (
        <SegmentGroup.Item
          key={range.value}
          value={range.value}
          disabled={range.value === disabledValue}
        >
          <SegmentGroup.ItemText>{range.label}</SegmentGroup.ItemText>
          <SegmentGroup.ItemHiddenInput />
        </SegmentGroup.Item>
      ))}
    </>
  );
}

const THEMES = [
  { value: 'light', label: 'Light', icon: sunIcon },
  { value: 'dark', label: 'Dark', icon: moonIcon },
  { value: 'system', label: 'System', icon: monitorIcon },
];

/** Light, dark and system, as icon-only items named by their radio buttons. */
function ThemeItems(): ReactElement {
  return (
    <>
      {THEMES.map((theme) => (
        <SegmentGroup.Item key={theme.value} value={theme.value}>
          <Icon icon={theme.icon} />
          <SegmentGroup.ItemHiddenInput aria-label={theme.label} />
        </SegmentGroup.Item>
      ))}
    </>
  );
}

/** A range picker: the indicator raises the checked item. */
export const Default: Story = {
  args: { defaultValue: 'week', 'aria-label': 'Range' },
  render: (args) => (
    <SegmentGroup.Root {...args}>
      <SegmentGroup.Indicator />
      <Ranges />
    </SegmentGroup.Root>
  ),
  play: async ({ canvas }) => {
    const group = canvas.getByRole('radiogroup', { name: 'Range' });
    await expect(group).toHaveClass('contour-segment-group');
    await expect(group).toHaveAttribute('data-size', 'md');

    await userEvent.click(canvas.getByText('Month'));
    await expect(canvas.getByRole('radio', { name: 'Month' })).toBeChecked();
  },
};

/**
 * A theme picker: sun, moon and monitor icons, each named for screen readers ("Light",
 * "Dark", "System").
 */
export const ThemePicker: Story = {
  args: { defaultValue: 'system', 'aria-label': 'Theme' },
  render: (args) => (
    <SegmentGroup.Root {...args}>
      <SegmentGroup.Indicator />
      <ThemeItems />
    </SegmentGroup.Root>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: 'System' })).toBeChecked();
    await userEvent.click(canvas.getByRole('radio', { name: 'Dark' }));
    await expect(canvas.getByRole('radio', { name: 'Dark' })).toBeChecked();
  },
};

/**
 * Every size with text items, icon-only items, a visible label, a disabled item and a disabled
 * group; then a vertical group.
 */
export const Variants: Story = {
  render: () => (
    <div style={{ display: 'grid', justifyItems: 'start', gap: vars.space['section-gap'] }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, max-content)',
          alignItems: 'center',
          justifyItems: 'start',
          gap: vars.space['group-gap'],
        }}
      >
        {sizes.map((size) => (
          <SizeRow key={size} size={size} />
        ))}
      </div>
      <SegmentGroup.Root orientation="vertical" defaultValue="week" aria-label="Vertical range">
        <SegmentGroup.Indicator />
        <Ranges />
      </SegmentGroup.Root>
    </div>
  ),
};

/** One row of the variant grid. */
function SizeRow({ size }: { readonly size: (typeof sizes)[number] }): ReactElement {
  return (
    <>
      <span style={caption}>{size}</span>
      <SegmentGroup.Root size={size} defaultValue="week" aria-label={`Range ${size}`}>
        <SegmentGroup.Indicator />
        <Ranges />
      </SegmentGroup.Root>
      <SegmentGroup.Root size={size} defaultValue="dark" aria-label={`Theme ${size}`}>
        <SegmentGroup.Indicator />
        <ThemeItems />
      </SegmentGroup.Root>
      <SegmentGroup.Root size={size} defaultValue="day">
        <SegmentGroup.Label>View</SegmentGroup.Label>
        <SegmentGroup.Indicator />
        <Ranges disabledValue="month" />
      </SegmentGroup.Root>
      <SegmentGroup.Root size={size} defaultValue="week" disabled aria-label={`Disabled ${size}`}>
        <SegmentGroup.Indicator />
        <Ranges />
      </SegmentGroup.Root>
      <SegmentGroup.Root size={size} aria-label={`Unchecked ${size}`}>
        <SegmentGroup.Indicator />
        <Ranges />
      </SegmentGroup.Root>
    </>
  );
}
