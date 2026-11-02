import { vars } from '@contour-ui/tokens';
import type { CSSProperties, ReactElement } from 'react';
import { page, userEvent } from 'vite-plus/test/browser';

import {
  formatDecibels,
  formatDuration,
  formatFrequency,
  formatNumber,
  formatPercent,
  Knob,
  powerScale,
} from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

const sizes = ['sm', 'md', 'lg'] as const satisfies ReadonlyArray<Knob.RootProps['size']>;

const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  gap: vars.space['section-gap'],
};

/** A pan readout: `C` in the middle, `L 30` and `R 50` either side of it. */
function formatPan(value: number): string {
  if (value === 0) {
    return 'C';
  }
  return `${value < 0 ? 'L' : 'R'} ${formatNumber(Math.abs(value))}`;
}

/** A gain from −12 dB to +12 dB, with a sign: a bipolar knob at 0 dB. */
const formatGain = (value: number): string => formatDecibels(value, { signed: true });

/** The attack time of an envelope: a curve that gives the short times more travel. */
const attackScale = powerScale(3);

interface LabelledKnobProps extends Knob.RootProps {
  readonly label: string;
}

/** The props of a knob of a kind, whose label may change. */
type KindProps = Knob.RootProps & Partial<LabelledKnobProps>;

/** A labelled knob with its readout. */
function LabelledKnob({ label, ...props }: LabelledKnobProps): ReactElement {
  return (
    <Knob.Root {...props}>
      <Knob.Label>{label}</Knob.Label>
      <Knob.Control />
      <Knob.ValueText />
    </Knob.Root>
  );
}

/** A gain in dB, as the output of a plugin has it. */
function Gain(props: KindProps): ReactElement {
  return (
    <LabelledKnob
      label="Gain"
      min={-60}
      max={12}
      step={0.1}
      defaultValue={-6}
      formatValue={formatDecibels}
      {...props}
    />
  );
}

/** A pan from hard left to hard right, at the middle by default. */
function Pan(props: KindProps): ReactElement {
  return (
    <LabelledKnob
      label="Pan"
      min={-100}
      max={100}
      step={1}
      origin={0}
      formatValue={formatPan}
      {...props}
    />
  );
}

/** Knobs from 0 to 1 along the travel: at its ends, a quarter of it and its middle. */
const MIX_VALUES = [
  { label: 'Drive', value: 0 },
  { label: 'Mix', value: 0.25 },
  { label: 'Tone', value: 0.5 },
  { label: 'Level', value: 1 },
] as const;

/** Focus a knob from the keyboard and step it up: it shows the focus ring. */
async function turnUp(name: string): Promise<void> {
  page.getByRole('slider', { name }).element().focus();
  await userEvent.keyboard('{ArrowUp}');
}

visualStates({
  // A gain knob in dB, a step up from the keyboard: the focus ring circles the dial.
  default: {
    render: () => <Gain />,
    ready: async () => {
      await turnUp('Gain');
    },
    focused: () => page.getByRole('slider', { name: 'Gain' }),
  },
  // The three sizes of the dial, with the same label and readout.
  sizes: {
    render: () => (
      <div style={row}>
        {sizes.map((size) => (
          <Gain key={size} size={size} label={size} />
        ))}
      </div>
    ),
  },
  // Values along the travel: its ends, a quarter and the middle, then a frequency on a
  // logarithmic scale and an attack time on a curve.
  values: {
    render: () => (
      <div style={row}>
        {MIX_VALUES.map(({ label, value }) => (
          <LabelledKnob
            key={label}
            label={label}
            min={0}
            max={1}
            defaultValue={value}
            formatValue={formatPercent}
          />
        ))}
        <LabelledKnob
          label="Cutoff"
          min={20}
          max={20_000}
          scale="log"
          defaultValue={1000}
          formatValue={formatFrequency}
        />
        <LabelledKnob
          label="Attack"
          min={0}
          max={2000}
          scale={attackScale}
          defaultValue={12}
          formatValue={formatDuration}
        />
      </div>
    ),
  },
  // Bipolar knobs: the range runs from the middle, the origin, either way; at the origin it has
  // no length.
  bipolar: {
    render: () => (
      <div style={row}>
        <Pan />
        <Pan label="Pan left" defaultValue={-30} />
        <Pan label="Pan right" defaultValue={50} />
        <LabelledKnob
          label="Boost"
          min={-12}
          max={12}
          step={0.1}
          origin={0}
          defaultValue={4.5}
          formatValue={formatGain}
        />
      </div>
    ),
  },
  // Disabled knobs, at the origin and off it: muted track, range, thumb, label and readout.
  disabled: {
    render: () => (
      <div style={row}>
        <Gain disabled />
        <Pan disabled defaultValue={50} />
      </div>
    ),
  },
  // A read-only knob takes focus from the keyboard, and a key leaves its value as it is.
  'read-only': {
    render: () => <Gain readOnly defaultValue={-12} />,
    ready: async () => {
      await turnUp('Gain');
    },
    focused: () => page.getByRole('slider', { name: 'Gain' }),
  },
});
