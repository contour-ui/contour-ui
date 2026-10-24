# @contour-ui/audio

**Layer 3 — kit.** Styled audio components (Knob, Fader, Meter…), built on
`@contour-ui/headless` and `@contour-ui/kit`, styled with plain CSS + token CSS
variables. No Tailwind.

- **May depend on (internal):** `@contour-ui/headless`, `@contour-ui/tokens`, `@contour-ui/icons`, `@contour-ui/kit`.
- **Peers:** `react`, `react-dom`.
- **Entry points:** `@contour-ui/audio`, `@contour-ui/audio/styles.css` (load after the tokens and kit CSS).
- **Styles:** one file per component (`src/<component>/<component>.css`), imported by `src/styles.css` into the `contour.audio` cascade layer, ranked above `contour.kit`; `vp pack` bundles them into one `dist/styles.css`.
- **Storybook:** port 6104.
