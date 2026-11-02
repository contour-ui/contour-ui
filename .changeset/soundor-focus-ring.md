---
'@contour-ui/soundor': minor
---

`Button` draws its focus ring with Soundor's outline (`outlineWidth`, `outlineColor`, `outlineOffset`), shown while Soundor's own `focusVisible` says so: a key gave the focus, or a key was pressed since a press did. It replaces a view outside the border and a tracker of the last input; the ring keeps its width and place. Needs `@soundor/react` 0.15.
