---
'@contour-ui/headless-react': minor
---

Add `Knob` (`Root`, `Label`, `Control`, `Track`, `Range`, `Thumb`, `ValueText`, `HiddenInput`), `useKnob` and `useKnobContext`: a rotary control on the slider pattern, an `svg` dial with `role="slider"` turned by a vertical drag (Shift for fine moves, with the pointer captured or, with `pointerLock`, locked), the wheel (the page stays still), the keys of a slider and a double click, which resets it, with `onValueChangeStart` and `onValueChangeEnd` around every gesture. The track, the range and the thumb draw the geometry of core in `currentColor`, and the root sets `--knob-position` and `--knob-angle` for dials of one's own. `Primitive` renders `svg`, `path` and `line`, and the package re-exports the readouts and scales of core (`formatDecibels`, `formatFrequency`, `logScale`…).
