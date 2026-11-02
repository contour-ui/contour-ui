import {
  Button,
  formatDecibels,
  formatFrequency,
  Knob,
  ThemeProvider,
  useTheme,
} from '@contour-ui/soundor';
import type { ButtonProps } from '@contour-ui/soundor';
import { ScrollView, Text, useParameter, View } from '@soundor/react';
import type { ReactElement, ReactNode } from 'react';
import { parameters } from 'soundor:parameters';

const VARIANTS = ['solid', 'subtle', 'outline', 'ghost'] as const;
const SIZES = ['sm', 'md', 'lg'] as const;

/** A pan position from −100 (left) to 100 (right): `L50`, `C`, `R25`. */
function formatPan(value: number): string {
  if (value === 0) {
    return 'C';
  }
  return value < 0 ? `L${-value}` : `R${value}`;
}

/** A linear gain from 0 to 1 in decibels: 0.5 is `−6.0 dB`, 0 is `−inf dB`. */
function formatGain(gain: number): string {
  return formatDecibels(20 * Math.log10(gain));
}

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}): ReactElement {
  const { tokens } = useTheme();
  return (
    <View
      style={{
        gap: tokens.space['group-gap'] * 2,
        padding: tokens.space['panel-inset'],
        borderWidth: tokens['border-width'].default,
        borderColor: tokens.color.border.subtle,
        borderRadius: tokens.radius.panel,
        backgroundColor: tokens.color.bg.surface,
      }}
    >
      <Text style={{ ...tokens.text.caption, color: tokens.color.fg.muted }}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ variant }: { readonly variant: NonNullable<ButtonProps['variant']> }): ReactElement {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space['group-gap'] }}>
      <Text style={{ ...tokens.text.caption, color: tokens.color.fg.muted, width: 56 }}>
        {variant}
      </Text>
      {SIZES.map((size) => (
        <Button key={size} variant={variant} size={size} debugId={`${variant}-${size}`}>
          {`Button ${size}`}
        </Button>
      ))}
      <Button variant={variant} disabled debugId={`${variant}-disabled`}>
        Disabled
      </Button>
    </View>
  );
}

/**
 * The plugin's `gain` parameter: the knob shows it as the host and the DSP have it, and every
 * change the user starts is one gesture to the host (its automation records it as one move).
 */
function GainKnob(): ReactElement {
  const { gain } = parameters;
  const value = useParameter(gain);
  return (
    <Knob.Root
      size="lg"
      min={gain.info.min}
      max={gain.info.max}
      defaultValue={gain.info.default}
      value={value}
      formatValue={formatGain}
      pointerLock
      onValueChange={(details) => {
        gain.set(details.value);
      }}
      onValueChangeStart={() => {
        gain.beginGesture();
      }}
      onValueChangeEnd={() => {
        gain.endGesture();
      }}
    >
      <Knob.Label>Gain</Knob.Label>
      <Knob.Control debugId="knob-gain" />
      <Knob.ValueText />
    </Knob.Root>
  );
}

function Knobs(): ReactElement {
  const { tokens } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space['section-gap'] }}>
      {SIZES.map((size) => (
        <Knob.Root key={size} size={size} defaultValue={50}>
          <Knob.Label>{`Knob ${size}`}</Knob.Label>
          <Knob.Control debugId={`knob-${size}`} />
          <Knob.ValueText />
        </Knob.Root>
      ))}
      <Knob.Root
        min={20}
        max={20_000}
        scale="log"
        defaultValue={1000}
        formatValue={formatFrequency}
      >
        <Knob.Label>Cutoff</Knob.Label>
        <Knob.Control debugId="knob-cutoff" />
        <Knob.ValueText />
      </Knob.Root>
      <Knob.Root min={-100} max={100} step={1} origin={0} defaultValue={0} formatValue={formatPan}>
        <Knob.Label>Pan</Knob.Label>
        <Knob.Control debugId="knob-pan" />
        <Knob.ValueText />
      </Knob.Root>
      <Knob.Root defaultValue={30} disabled>
        <Knob.Label>Disabled</Knob.Label>
        <Knob.Control debugId="knob-disabled" />
        <Knob.ValueText />
      </Knob.Root>
      <GainKnob />
    </View>
  );
}

function Panel(): ReactElement {
  const { theme, tokens, setTheme } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        gap: tokens.space['section-gap'],
        padding: tokens.space['panel-inset'] * 2,
        backgroundColor: tokens.color.bg.canvas,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ ...tokens.text.heading, color: tokens.color.fg.default }}>
          contour-ui for Soundor
        </Text>
        <Button
          variant="outline"
          size="sm"
          debugId="theme"
          onPress={() => {
            setTheme(theme === 'light' ? 'dark' : 'light');
          }}
        >
          {theme === 'light' ? 'Dark theme' : 'Light theme'}
        </Button>
      </View>
      <Section title="Buttons">
        {VARIANTS.map((variant) => (
          <Row key={variant} variant={variant} />
        ))}
      </Section>
      <Section title="Knobs">
        <Knobs />
      </Section>
      <Text style={{ ...tokens.text.value, color: tokens.color.fg.muted }}>
        Tab moves the focus ring; Enter or Space presses. Drag a knob up or down (Shift for fine
        moves), turn the wheel or use the arrows; a double click resets it. Gain is the parameter of
        the plugin, and locks the pointer while it drags.
      </Text>
    </View>
  );
}

export function App(): ReactElement {
  return (
    <ThemeProvider>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <Panel />
      </ScrollView>
    </ThemeProvider>
  );
}
