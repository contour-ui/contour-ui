---
'@contour-ui/kit': minor
---

Add `Popover`: the popover of `@contour-ui/headless-react` with the look of Kit, in `Root`, `Trigger`, `Anchor`, `Positioner`, `Content`, `Title`, `Description` and `CloseTrigger` parts. The content is a raised panel with a border, a shadow and the corners of a panel, next to its trigger (below, at its start edge, by default), as wide as what it holds up to 320px, or as wide as its trigger with `sameWidth`, and scrolling past the room it has. It grows in from the edge next to the trigger and shrinks back as it closes, and only fades under reduced motion; the positioner stacks above the page with the other overlays. `Trigger` takes a `Button` with `asChild`; `CloseTrigger` is a small ghost x in the top end corner, which the title makes room for, or, with `asChild`, a button of your own. Put the positioner in the `Portal` that Kit exports.
