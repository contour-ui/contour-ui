---
'@contour-ui/headless-react': minor
---

Run on every platform from the same sources, on `@contour-ui/primitive`: the web build (the default) exports every component, the Soundor build (the `soundor` export condition) those that run in Soundor plugin UIs, the Knob first. `Primitive`, `mergeProps`, `composeRefs` and `useComposedRefs` now come from `@contour-ui/primitive`, re-exported as before. The Knob is one source for both platforms: its control reads the input through the services of the element layer; its context gains `hovered` and `interaction` (the store of the control's interaction state) and `registerLabel`; `Knob.ValueText` is `aria-hidden`, since the control carries the value; a double click resets at its second press, which starts no drag, so it makes two gestures (`onValueChangeStart`/`onValueChangeEnd` pairs) in place of three. `react-dom` is now an optional peer.
