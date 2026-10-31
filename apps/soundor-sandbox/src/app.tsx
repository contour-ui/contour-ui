import { Button, ThemeProvider, useTheme } from '@contour-ui/soundor';
import type { ButtonProps } from '@contour-ui/soundor';
import { ScrollView, Text, View } from '@soundor/react';
import type { ReactElement } from 'react';

const VARIANTS = ['solid', 'subtle', 'outline', 'ghost'] as const;
const SIZES = ['sm', 'md', 'lg'] as const;

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
        {VARIANTS.map((variant) => (
          <Row key={variant} variant={variant} />
        ))}
      </View>
      <Text style={{ ...tokens.text.value, color: tokens.color.fg.muted }}>
        Tab moves the focus ring; Enter or Space presses.
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
