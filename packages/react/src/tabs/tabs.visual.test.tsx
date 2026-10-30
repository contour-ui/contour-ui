import { fileTextIcon, tableIcon } from '@contour-ui/icons';
import { vars } from '@contour-ui/tokens';
import type { CSSProperties, ReactElement } from 'react';
import { vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';

import { Icon, Tabs } from '../index.ts';
import type { Tabs as TabsTypes } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

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

/** Wait until every indicator on the page is measured and shown (the play of Variants waits too). */
async function indicatorsShown(count: number): Promise<void> {
  await vi.waitFor(() => {
    const shown = document.querySelectorAll('.contour-tabs__indicator:not([hidden])').length;
    if (shown !== count) {
      throw new Error(`${shown} of ${count} indicators shown.`);
    }
  });
}

visualStates({
  // The story selects Inserts with a click.
  default: {
    render: () => <Channel />,
    ready: async () => {
      // From the keyboard, where the story clicked it: the focus shows its ring, as the story's
      // synthetic click left it, and the pointer hovers nothing.
      page.getByRole('tab', { name: 'Inserts' }).element().focus();
      await userEvent.keyboard('{Enter}');
      await indicatorsShown(1);
    },
    focused: () => page.getByRole('tab', { name: 'Inserts' }),
  },
  // Every variant in every size, the second tab disabled; the indicator draws the mark.
  variants: {
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
    ready: async () => {
      await indicatorsShown(variants.length * sizes.length);
    },
  },
  // Without an indicator, the selected trigger draws the mark itself.
  'without-indicator': {
    render: () => (
      <div style={{ display: 'grid', gap: vars.space['section-gap'] }}>
        {variants.map((variant) => (
          <Channel key={variant} variant={variant} indicator={false} />
        ))}
      </div>
    ),
  },
  // A vertical list beside the contents, in each variant.
  vertical: {
    render: () => (
      <div style={{ display: 'grid', gap: vars.space['section-gap'] }}>
        {variants.map((variant) => (
          <Channel key={variant} variant={variant} orientation="vertical" />
        ))}
      </div>
    ),
    ready: async () => {
      await indicatorsShown(variants.length);
    },
  },
  // Icons before the labels, sized by the trigger.
  'with-icons': {
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
    ready: async () => {
      await indicatorsShown(sizes.length);
    },
  },
});
