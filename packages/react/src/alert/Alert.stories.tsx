import { moonIcon } from '@contour-ui/icons';
import { vars } from '@contour-ui/tokens';
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { useId, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { expect, userEvent } from 'storybook/test';

import { Alert, Icon } from '../index.ts';

type Status = NonNullable<Alert.RootProps['status']>;
type Variant = NonNullable<Alert.RootProps['variant']>;

const STATUSES: readonly Status[] = ['info', 'success', 'warning', 'danger', 'neutral'];
const VARIANTS: readonly Variant[] = ['subtle', 'outline'];

/** A title and a message for each status. */
const SAMPLES: Readonly<Record<Status, { readonly title: string; readonly description: string }>> =
  {
    info: { title: 'Pre-release', description: 'The packages are not on npm yet.' },
    success: { title: 'Preset saved', description: 'Your changes are stored with the project.' },
    warning: {
      title: 'Output is clipping',
      description: 'The signal peaks above 0 dBFS. Lower the gain to avoid distortion.',
    },
    danger: {
      title: 'Audio engine stopped',
      description: 'The plugin lost its audio device. Reopen the project to try again.',
    },
    neutral: { title: 'Tip', description: 'Hold Shift while dragging a knob to fine-tune it.' },
  };

const stack: CSSProperties = {
  display: 'grid',
  alignContent: 'start',
  gap: vars.space['group-gap'],
};

/** A single alert at the width of a docs column, not of the whole canvas. */
const narrow: Decorator = (Story) => (
  <div style={{ maxInlineSize: '560px' }}>
    <Story />
  </div>
);

const meta: Meta<typeof Alert.Root> = {
  title: 'Essentials/Alert',
  component: Alert.Root,
  tags: ['autodocs'],
  args: { status: 'info', variant: 'subtle' },
  argTypes: {
    status: { control: 'inline-radio', options: STATUSES },
    variant: { control: 'inline-radio', options: VARIANTS },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [narrow],
  render: (args) => (
    <Alert.Root {...args}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>Pre-release</Alert.Title>
        <Alert.Description>The packages are not on npm yet.</Alert.Description>
      </Alert.Content>
    </Alert.Root>
  ),
  play: async ({ canvas }) => {
    const root = canvas.getByText('Pre-release').closest('.contour-alert');

    await expect(root).toHaveAttribute('data-status', 'info');
    await expect(root).toHaveAttribute('data-variant', 'subtle');
    // No role by default: static text is read as part of the page, not announced.
    await expect(root).not.toHaveAttribute('role');
  },
};

function VariantColumn({ variant }: { readonly variant: Variant }): ReactElement {
  const labelId = useId();
  return (
    <section aria-labelledby={labelId} style={stack}>
      <div
        id={labelId}
        style={{
          color: vars.color.fg.muted,
          font: vars.text.label.font,
          letterSpacing: vars.text.label.letterSpacing,
        }}
      >
        {variant}
      </div>
      {STATUSES.map((status) => (
        <Alert.Root key={status} status={status} variant={variant}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{SAMPLES[status].title}</Alert.Title>
            <Alert.Description>{SAMPLES[status].description}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      ))}
      {STATUSES.map((status) => (
        <Alert.Root key={status} status={status} variant={variant}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{SAMPLES[status].description}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      ))}
    </section>
  );
}

/** Every status in both variants, with a title and without one. */
export const StatusesAndVariants: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: vars.space['section-gap'],
      }}
    >
      {VARIANTS.map((variant) => (
        <VariantColumn key={variant} variant={variant} />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    const shown = VARIANTS.map((variant) =>
      [
        ...canvas
          .getByRole('region', { name: variant })
          .querySelectorAll<HTMLElement>('.contour-alert'),
      ].map(({ dataset }) => `${dataset['variant']} ${dataset['status']}`),
    );

    await expect(shown).toStrictEqual(
      VARIANTS.map((variant) => [...STATUSES, ...STATUSES].map((status) => `${variant} ${status}`)),
    );
    // The status icons are decorative: none of them is announced as an image.
    await expect(canvas.queryAllByRole('img')).toStrictEqual([]);
  },
};

/** Children of `Alert.Indicator` replace the status icon. */
export const CustomIndicator: Story = {
  decorators: [narrow],
  args: { status: 'neutral' },
  render: (args) => (
    <Alert.Root {...args}>
      <Alert.Indicator>
        <Icon icon={moonIcon} />
      </Alert.Indicator>
      <Alert.Content>
        <Alert.Title>Dark by default</Alert.Title>
        <Alert.Description>
          Set data-theme=&quot;light&quot; on any element to switch its subtree to the light theme.
        </Alert.Description>
      </Alert.Content>
    </Alert.Root>
  ),
  play: async ({ canvas }) => {
    const paths = canvas
      .getByText('Dark by default')
      .closest('.contour-alert')
      ?.querySelectorAll('.contour-alert__indicator path');

    await expect([...(paths ?? [])].map((path) => path.getAttribute('d'))).toStrictEqual(
      moonIcon.paths.map((path) => path.d),
    );
  },
};

function SavePreset(): ReactElement {
  const [saved, setSaved] = useState(false);
  return (
    <div style={stack}>
      {/* The pattern the docs give: the role on the alert itself, not an `<output>`. */}
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <Alert.Root role="status" status={saved ? 'success' : 'neutral'}>
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>
            {saved ? 'Preset saved.' : 'The preset has unsaved changes.'}
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>
      <div>
        <button
          type="button"
          onClick={() => {
            setSaved(true);
          }}
        >
          Save preset
        </button>
      </div>
    </div>
  );
}

/**
 * A message that changes while the page is open: with `role="status"`, screen
 * readers announce the new text.
 */
export const StatusMessage: Story = {
  decorators: [narrow],
  render: () => <SavePreset />,
  play: async ({ canvas }) => {
    const status = canvas.getByRole('status');

    await expect(status).toHaveTextContent('The preset has unsaved changes.');
    await userEvent.click(canvas.getByRole('button', { name: 'Save preset' }));
    await expect(status).toHaveTextContent('Preset saved.');
    await expect(status).toHaveAttribute('data-status', 'success');
  },
};
