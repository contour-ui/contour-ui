---
'@contour-ui/soundor': patch
---

`Button` reads its interaction state from a hook of its own rather than from the `style` and `children` functions of `Pressable`, and draws its parts from that one value. Nothing changes for its users: a `style` function still receives `pressed`, `hovered`, `focused` and `focusVisible`, all at rest while the button is disabled.
