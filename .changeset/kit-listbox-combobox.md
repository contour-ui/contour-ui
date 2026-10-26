---
'@contour-ui/kit': minor
---

`Listbox.Input` has the `combobox` role now, from `@contour-ui/headless`, with `aria-expanded="true"` and no `aria-haspopup`: queries by role find it as a `combobox`, no longer as a `textbox`. Its look does not change.
