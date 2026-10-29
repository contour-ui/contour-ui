---
'@contour-ui/headless-react': minor
---

Add `Listbox`: `Root`, `Label`, `Input`, `Content`, `ItemGroup`, `ItemGroupLabel`, `Item`, `ItemText`, `ItemIndicator` and `Empty` on the listbox machine of `@contour-ui/core`. The list keeps the focus and points to the highlighted option with `aria-activedescendant`: arrows, Home and End move the highlight, typed letters find an item, Enter, Space and a click select. `Listbox.Input` drives the list from a text field, as a search box: ↓ and ↑ move the highlight, Enter selects, the caret keys stay with the text, and a click on an item keeps the focus in the input. The highlighted item scrolls into view inside the list, never the page. `useListbox`, `useListboxContext` and `useListboxItemContext` give the same API to parts of your own; `createListCollection` is re-exported from core.
