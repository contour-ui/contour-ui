import { moonIcon } from '@contour-ui/icons';
import { vars } from '@contour-ui/tokens';
import { useId, useState } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { page, userEvent } from 'vite-plus/test/browser';

import { Alert, Icon } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

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
function Narrow({ children }: { readonly children: ReactNode }): ReactElement {
  return <div style={{ maxInlineSize: '560px' }}>{children}</div>;
}

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

visualStates({
  default: {
    render: () => (
      <Narrow>
        <Alert.Root status="info" variant="subtle">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Pre-release</Alert.Title>
            <Alert.Description>The packages are not on npm yet.</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      </Narrow>
    ),
  },
  // Every status in both variants, with a title and without one.
  'statuses-and-variants': {
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
  },
  // Children of `Alert.Indicator` replace the status icon.
  'custom-indicator': {
    render: () => (
      <Narrow>
        <Alert.Root status="neutral" variant="subtle">
          <Alert.Indicator>
            <Icon icon={moonIcon} />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>Dark by default</Alert.Title>
            <Alert.Description>
              Set data-theme=&quot;light&quot; on any element to switch its subtree to the light
              theme.
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      </Narrow>
    ),
  },
  // The message once saved: the story's play pressed the button, which kept the focus.
  'status-message': {
    render: () => (
      <Narrow>
        <SavePreset />
      </Narrow>
    ),
    // The press of the play, from the keyboard: its click focused the button with a ring.
    ready: async () => {
      await userEvent.tab();
      await userEvent.keyboard('{Enter}');
    },
    focused: () => page.getByRole('button', { name: 'Save preset' }),
  },
});
