# @contour-ui/soundor

**Layer 3 — styled.** Styled components for [Soundor](https://soundor.dev) plugin UIs, built on
`@soundor/react` (`View`, `Text`, `Pressable`…) and drawn with the values of the contour-ui tokens
(`@contour-ui/tokens/soundor`). The same components, parts, props and variants as
`@contour-ui/react`, where Soundor can draw them. No DOM and no CSS: styles are objects, per theme.

- **May depend on (internal):** `@contour-ui/soundor-headless`, `@contour-ui/tokens`,
  `@contour-ui/icons`, `@contour-ui/fonts`.
- **Fonts:** `registerFonts()` registers the TTF faces of `@contour-ui/fonts` (IBM Plex Sans,
  JetBrains Mono) with Soundor's `registerFont`; uncalled, Soundor's bundler ships none of them.
- **Peers:** `react`, `@soundor/react`.
- **Runs on:** every Soundor runtime: natively on Hermes, and in the browser (the web runtime).

## Components

| Component | What it is                                                                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`  | A button in four variants (`solid`, `subtle`, `outline`, `ghost`) and three sizes (`sm`, `md`, `lg`), on `Pressable`.                                             |
| `Knob`    | A rotary control in three sizes (`sm`, `md`, `lg`): `Root`, `Label`, `Control` (an `Svg` dial: `Track`, `Range`, `Thumb`) and `ValueText`, on `soundor-headless`. |

## Usage

```tsx
import {
  Button,
  formatFrequency,
  Knob,
  registerFonts,
  ThemeProvider,
  useTheme,
} from '@contour-ui/soundor';
import { render, Text, View } from '@soundor/react';

function Panel() {
  const { tokens } = useTheme();
  return (
    <View
      style={{ backgroundColor: tokens.color.bg.surface, padding: tokens.space['panel-inset'] }}
    >
      <Text style={{ ...tokens.text.body, color: tokens.color.fg.default }}>Filter</Text>
      <Knob.Root
        min={20}
        max={20_000}
        scale="log"
        defaultValue={1000}
        formatValue={formatFrequency}
      >
        <Knob.Label>Cutoff</Knob.Label>
        <Knob.Control />
        <Knob.ValueText />
      </Knob.Root>
      <Button variant="outline" onPress={reset}>
        Reset
      </Button>
    </View>
  );
}

// Before the first render, so text is laid out in the token fonts from the first frame.
void registerFonts();

render(
  <ThemeProvider defaultTheme="dark">
    <Panel />
  </ThemeProvider>,
);
```

`ThemeProvider` keeps the theme of the view, `defaultTheme` until `setTheme` chooses another;
components below it draw with that theme's token values, and with the default theme (dark)
without a provider. Soundor has no color scheme of the system, and the choice is not stored yet.

## Differences from `@contour-ui/react`

- **Presses:** `onPress` (Soundor's `Pressable`), where the web has `onClick`.
- **Styles:** `style`, an object or a function of the state, in place of `className` and
  `asChild`: of a `Button`, its interaction state (`pressed`, `hovered`, `focused`,
  `focusVisible`); of `Knob.Label`, `Knob.Control` and `Knob.ValueText`, the knob (`value`,
  `dragging`, `hovered`, `focusVisible`…). The shapes of a dial take SVG presentation props
  (`color`, `strokeWidth`…).
- **Focus:** Soundor has no `:focus-visible` selector: the ring follows the state's
  `focusVisible`, Soundor's own (a key gave the focus, or a key was pressed since a press did), as
  `:focus-visible` does on the web. It is Soundor's outline (`outlineWidth`, `outlineColor`,
  `outlineOffset`), as wide and as far out as the web's, outside the border and taking no room.
- **Knob:** a double press resets the value (Soundor has no `dblclick`), and its second press drags
  nothing. A drag reads Soundor's `movementY`, with the pointer locked or not (`pointerLock`).
  `Knob.Label` names the control by its text (`accessibilityLabel` on `Knob.Control` takes its
  place), and assistive technology reads the label and the readout with the control. There is no
  `Knob.HiddenInput`: a plugin has no forms.
- **Motion:** colors change at once: Soundor animates paint only through explicit keyframes.

## Development

- Types: `lib: ["ES2023"]` and `@soundor/environment` (the preset `library-soundor.json`), so code
  that reaches for `window` or `document` fails to compile.
- Tests run in Node on Soundor's simulated runtime (`vp -C packages/soundor test`): the node tree,
  input, focus and accessibility, without layout or pixels.
