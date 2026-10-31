# @contour-ui/soundor

**Layer 3 — styled.** Styled components for [Soundor](https://soundor.dev) plugin UIs, built on
`@soundor/react` (`View`, `Text`, `Pressable`…) and drawn with the values of the contour-ui tokens
(`@contour-ui/tokens/soundor`). The same components, parts, props and variants as
`@contour-ui/react`, where Soundor can draw them. No DOM and no CSS: styles are objects, per theme.

- **May depend on (internal):** `@contour-ui/tokens`, `@contour-ui/icons`, `@contour-ui/fonts`.
- **Peers:** `react`, `@soundor/react`.
- **Runs on:** every Soundor runtime: natively on Hermes, and in the browser (the web runtime).

## Usage

```tsx
import { ThemeProvider, useTheme } from '@contour-ui/soundor';
import { render, Text, View } from '@soundor/react';

function Panel() {
  const { tokens } = useTheme();
  return (
    <View
      style={{ backgroundColor: tokens.color.bg.surface, padding: tokens.space['panel-inset'] }}
    >
      <Text style={{ ...tokens.text.body, color: tokens.color.fg.default }}>Gain</Text>
    </View>
  );
}

render(
  <ThemeProvider defaultTheme="dark">
    <Panel />
  </ThemeProvider>,
);
```

`ThemeProvider` keeps the theme of the view, `defaultTheme` until `setTheme` chooses another;
components below it draw with that theme's token values, and with the default theme (dark)
without a provider. Soundor has no color scheme of the system, and the choice is not stored yet.

## Development

- Types: `lib: ["ES2023"]` and `@soundor/environment` (the preset `library-soundor.json`), so code
  that reaches for `window` or `document` fails to compile.
- Tests run in Node on Soundor's simulated runtime (`vp -C packages/soundor test`): the node tree,
  input, focus and accessibility, without layout or pixels.
