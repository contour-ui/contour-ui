---
'@contour-ui/core': minor
---

Add the `segmentGroup` machine: a set of items of which at most one is checked, as a radio group. Its value is controlled or owned (`value`, `defaultValue`, `onValueChange({ value })`), `disabled` and `readOnly` ignore user checks while `setValue` still applies, and it tracks the focused item and whether it shows a focus ring. `connect` gives the state of each item.
