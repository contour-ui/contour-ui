---
'@contour-ui/react': minor
---

Add `Knob`, the first Audio control: a dial in three sizes (`sm`, `md`, `lg`, the `--ct-size-knob-*` tokens) with its label above and a monospace readout below. The accent range runs from the origin to the value, either way for a bipolar knob, and brightens while hovered or dragged; `Knob.Control` draws the track, the range and the thumb when it has no children. The readouts and scales of value controls (`formatDecibels`, `formatFrequency`, `logScale`…) are re-exported, so a Knob needs no other package.
