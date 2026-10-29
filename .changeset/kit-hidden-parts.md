---
'@contour-ui/react': patch
---

Parts that set a `display` of their own hide again with the `hidden` attribute, which that `display` overrode: the root, list, groups and items of `Listbox`, the header, body and footer of `Dialog` and `Drawer`, every part of `Card` and `Alert`, the header of `CodeBlock`, and `Kbd`. A search, for one, can hide its list with `hidden` while it has no results.
