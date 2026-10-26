---
'@contour-ui/kit': patch
---

`Dialog`, `Drawer` and `Popover` take their sizes from the `--ct-size-dialog-*`, `--ct-size-drawer-*` and `--ct-size-popover` tokens instead of fixed pixel values. The sizes do not change; set a token on the content, or for the whole page, to change them.
