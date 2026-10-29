---
'@contour-ui/kit': patch
---

The x of `Dialog` and `Drawer` (`CloseTrigger`) is size `md` by default, 24 px square instead of 20, the smallest target WCAG 2.2 asks for (2.5.8); it stays centered on the first line of the title, about as far from the top as from the end, and the header makes room for the larger button (`--ct-size-control-md`).
