---
'@contour-ui/core': minor
---

Add the table of contents machine, exported as the `toc` namespace: `toc.machine`, `toc.connect` (`items`, `activeIds`, `activeItems`, `getItemState()` with `active`, `first`, `last` and `depth`, `setActiveIds()`, `scrollTo()`) and its types. While it runs, the platform effect `observeHeadings` reports each heading of `items` as `above`, `inside` or `below` the observed area (`rootMargin`, `threshold`, in the container `scrollEl` returns); the headings inside are active, in the order of `items`, and when none is, the last heading scrolled past stays active. `onActiveChange({ activeIds, activeItems })` reports each change, controlled (`activeIds`) or owned (`defaultActiveIds`). `SCROLL_TO` scrolls to a heading through the platform action `scrollToHeading` (`scrollBehavior`). New `items`, `rootMargin` or `threshold` restart the observation, and new `items` drop the headings that are gone.
