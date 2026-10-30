import { monitorIcon, moonIcon, sunIcon } from '@contour-ui/icons';
import { vars } from '@contour-ui/tokens';
import type { CSSProperties, ReactElement } from 'react';
import { page, userEvent } from 'vite-plus/test/browser';

import { Icon, SegmentGroup } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

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

/**
 * Check the item whose radio button is named `name` from the keyboard, where the stories clicked
 * it: the focus shows its ring, as the stories' synthetic clicks left it, and the pointer hovers
 * nothing.
 */
async function check(name: string): Promise<void> {
  page.getByRole('radio', { name }).element().focus();
  await userEvent.keyboard(' ');
}

visualStates({
  // A range picker: the indicator raises the checked item. The story clicks Month.
  default: {
    render: () => (
      <SegmentGroup.Root defaultValue="week" aria-label="Range">
        <SegmentGroup.Indicator />
        <Ranges />
      </SegmentGroup.Root>
    ),
    ready: async () => {
      await check('Month');
    },
    focused: () => page.getByRole('radio', { name: 'Month' }),
  },
  // A theme picker: sun, moon and monitor icons, each named for screen readers. The story checks
  // Dark.
  'theme-picker': {
    render: () => (
      <SegmentGroup.Root defaultValue="system" aria-label="Theme">
        <SegmentGroup.Indicator />
        <ThemeItems />
      </SegmentGroup.Root>
    ),
    ready: async () => {
      await check('Dark');
    },
    focused: () => page.getByRole('radio', { name: 'Dark' }),
  },
  // Every size with text items, icon-only items, a visible label, a disabled item and a disabled
  // group; then a vertical group.
  variants: {
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
  },
});
