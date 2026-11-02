---
'@contour-ui/soundor-headless': minor
---

New package: `@contour-ui/soundor-headless`, unstyled components for Soundor plugin UIs that run the machines of `@contour-ui/core` with Soundor's input, focus and accessibility. It starts with `Knob` (`Root`, `Label`, `Control`, `Track`, `Range`, `Thumb`, `ValueText`), `useKnob` and `useKnobContext`: the control is an adjustable `Svg` of `@soundor/react/svg` that a vertical drag turns (Soundor's `movementY`, with the pointer locked under `pointerLock`), as do the wheel, the keys of a slider and the `increment`, `decrement` and `setValue` actions of assistive technology; a double press resets it. `Knob.Label` names the control by its text. The readouts and scales of `@contour-ui/core` are re-exported.
