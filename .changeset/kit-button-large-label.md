---
'@contour-ui/kit': minor
---

A `lg` `Button` has a larger label, wider sides and a wider gap to its icon, in proportion to its height: the `label-lg` text style (13 px instead of 11 px), `--ct-space-control-inset-lg` (12 px instead of 6 px) and `--ct-space-control-gap-lg` (6 px instead of 4 px). `sm` and `md` do not change, and neither do `IconButton` and `CloseButton`, which have no label. An app that enlarged the label or the padding of its `lg` buttons by hand can drop that override. A `Button` with the `hidden` attribute hides again: its `display` overrode the browser's `[hidden]`.
