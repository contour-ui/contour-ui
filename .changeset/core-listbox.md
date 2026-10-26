---
'@contour-ui/core': minor
---

Add the listbox machine, exported as the `listbox` namespace: `listbox.machine`, `listbox.connect` and its types. One state; the events move the highlight over the enabled items of a list collection (`HIGHLIGHT.FIRST`, `LAST`, `NEXT`, `PREVIOUS`, `TYPEAHEAD`, `ITEM.HOVER`), select (`ITEM.CLICK`, `ITEM.SELECT`, `HIGHLIGHTED.SELECT`, `VALUE.SET`) and follow the focus (`CONTENT.FOCUS`, `INPUT.FOCUS`, `BLUR`). The value and the highlight are owned or controlled, reported through `onValueChange({ value, items })` and `onHighlightChange`; `onSelect({ value, item })` reports each item the user selects. Props: `selectionMode` (`single`, `multiple`), `deselectable`, `selectOnHighlight`, `loopFocus`, `typeahead`, `highlightOnHover`, `autoHighlight`, `disabled`, `orientation`. A collection with other items clears a highlight that is gone, or highlights the first item with `autoHighlight` while the listbox has focus.
