# @contour-ui/soundor-headless

**Layer 2 — headless.** Unstyled components for [Soundor](https://soundor.dev) plugin UIs: the
machines of `@contour-ui/core` on the primitives of `@soundor/react`, with their input (pointer,
wheel, keys), focus and accessibility. The same components, parts and props as
`@contour-ui/headless-react`, where Soundor has them; `@contour-ui/soundor` styles them.

- **May depend on (internal):** `@contour-ui/core`.
- **Peers:** `react`, `@soundor/react`.
- **Runs on:** every Soundor runtime: natively on Hermes, and in the browser (the web runtime).

## Components

| Component | What it is                                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Knob`    | A rotary control: `Root` (`View`), `Label` and `ValueText` (`Text`), `Control` (an adjustable `Svg`: a vertical drag, the wheel, the keys, a double press, the actions of assistive technology), `Track`, `Range` (`Path`) and `Thumb` (`Line`). |

`useKnob` runs a knob for parts of your own, and `useKnobContext` reads it inside `Knob.Root`. The
readouts and scales of value controls (`formatNumber`, `formatFrequency`, `formatDecibels`,
`formatDuration`, `formatPercent`, `linearScale`, `logScale`, `powerScale`) come from
`@contour-ui/core`, re-exported for apps that use only this package.

## Development

- Types: `lib: ["ES2023"]` and `@soundor/environment` (the preset `library-soundor.json`), so code
  that reaches for `window` or `document` fails to compile.
- Tests run in Node on Soundor's simulated runtime (`vp -C packages/soundor-headless test`): the
  node tree, input, focus and accessibility, without layout or pixels.
