---
'@contour-ui/headless-react': minor
---

`Listbox.Input` has the `combobox` role now, with `aria-expanded="true"`, since the list it controls is shown with it; `aria-haspopup`, which a combobox implies, is gone. Screen readers announce the field with its options, as the field of a command palette, and accessibility checkers no longer ask a list that scrolls under the field to take focus of its own. Queries by role find the field as a `combobox`, no longer as a `textbox`.
