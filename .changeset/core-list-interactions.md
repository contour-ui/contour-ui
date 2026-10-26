---
'@contour-ui/core': minor
---

Add list collections and the first interactions. `createListCollection` holds items with their values, texts, disabled states and groups (`groupBy`), immutable: the first, last, next and previous enabled values, with or without wrapping around, and the typeahead `search`, which moves on with each press of one letter and refines with more, ignoring case, without `localeCompare`. `getListIntent` turns a key into a move in a list (`first`, `last`, `next`, `previous`) by orientation and text direction; `nextTypeahead` builds the typeahead query from the characters typed less than `timeout` ms apart (500 by default), with the time given by the adapter, and keeps Space for selecting outside a query. `KeyLike` is the key event they read.
