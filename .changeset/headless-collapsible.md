---
'@contour-ui/headless': minor
---

Add `Collapsible` (`Root`, `Trigger`, `Content`, `Indicator`), `useCollapsible` and `useCollapsibleContext`: a disclosure whose trigger carries `aria-expanded` and `aria-controls` and is `disabled` with the collapsible. The content takes `lazyMount`, `unmountOnExit` and `onExitComplete` from the root, stays shown and `inert` until its exit animation ends, and carries the size it takes when open as `--height` and `--width`, measured as it opens and whenever it resizes while open. Content open on the first render shows without its open animation (`animation-name: none` until it first closes). The trigger can sit anywhere inside the root, such as next to a link.
