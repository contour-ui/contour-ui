import { fileTextIcon, tableIcon } from '@contour-ui/icons';
import { vars } from '@contour-ui/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactElement } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Icon, Tabs } from '../index.ts';
import type { Tabs as TabsTypes } from '../index.ts';

const meta: Meta<typeof Tabs.Root> = {
  title: 'Kit/Tabs',
  component: Tabs.Root,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

const variants = ['line', 'enclosed', 'subtle'] as const satisfies ReadonlyArray<
  TabsTypes.RootProps['variant']
>;
const sizes = ['sm', 'md', 'lg'] as const satisfies ReadonlyArray<TabsTypes.RootProps['size']>;

const caption: CSSProperties = {
  font: vars.text.caption.font,
  letterSpacing: vars.text.caption.letterSpacing,
  color: vars.color.fg.muted,
};

/** A channel strip's tabs: Sends is disabled. */
function Channel({
  indicator = true,
  ...props
}: TabsTypes.RootProps & { readonly indicator?: boolean }): ReactElement {
  const label = `${props.variant ?? 'line'} ${props.size ?? 'md'}`;
  return (
    <Tabs.Root defaultValue="mix" {...props}>
      <Tabs.List aria-label={label}>
        <Tabs.Trigger value="mix">Mix</Tabs.Trigger>
        <Tabs.Trigger value="sends" disabled>
          Sends
        </Tabs.Trigger>
        <Tabs.Trigger value="inserts">Inserts</Tabs.Trigger>
        <Tabs.Trigger value="meter">Meter</Tabs.Trigger>
        {indicator ? <Tabs.Indicator /> : null}
      </Tabs.List>
      <Tabs.Content value="mix">Volume and pan of the channel.</Tabs.Content>
      <Tabs.Content value="sends">Send levels.</Tabs.Content>
      <Tabs.Content value="inserts">Effects in series.</Tabs.Content>
      <Tabs.Content value="meter">Peak and loudness.</Tabs.Content>
    </Tabs.Root>
  );
}

export const Default: Story = {
  render: () => <Channel />,
  play: async ({ canvas }) => {
    const root = canvas.getByRole('tablist').closest('.contour-tabs');
    await expect(root).toHaveAttribute('data-variant', 'line');
    await expect(root).toHaveAttribute('data-size', 'md');
    await userEvent.click(canvas.getByRole('tab', { name: 'Inserts' }));
    await expect(canvas.getByRole('tabpanel', { name: 'Inserts' })).toBeVisible();
  },
};

/** Every variant in every size, the second tab disabled; the indicator draws the mark. */
export const Variants: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: vars.space['section-gap'] }}>
      {variants.map((variant) => (
        <div key={variant} style={{ display: 'grid', gap: vars.space['group-gap'] }}>
          <span style={caption}>{variant}</span>
          {sizes.map((size) => (
            <Channel key={size} variant={variant} size={size} />
          ))}
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Every indicator is measured and shown.
    await waitFor(async () => {
      await expect(
        canvasElement.querySelectorAll('.contour-tabs__indicator:not([hidden])'),
      ).toHaveLength(variants.length * sizes.length);
    });
  },
};

/** Without an indicator, the selected trigger draws the mark itself. */
export const WithoutIndicator: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: vars.space['section-gap'] }}>
      {variants.map((variant) => (
        <Channel key={variant} variant={variant} indicator={false} />
      ))}
    </div>
  ),
};

/** A vertical list beside the contents, in each variant. */
export const Vertical: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: vars.space['section-gap'] }}>
      {variants.map((variant) => (
        <Channel key={variant} variant={variant} orientation="vertical" />
      ))}
    </div>
  ),
};

/** Icons before the labels, sized by the trigger. */
export const WithIcons: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: vars.space['group-gap'] }}>
      {sizes.map((size) => (
        <Tabs.Root key={size} defaultValue="notes" size={size} variant="subtle">
          <Tabs.List aria-label={`View ${size}`}>
            <Tabs.Trigger value="notes">
              <Icon icon={fileTextIcon} />
              Notes
            </Tabs.Trigger>
            <Tabs.Trigger value="table">
              <Icon icon={tableIcon} />
              Table
            </Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
        </Tabs.Root>
      ))}
    </div>
  ),
};
