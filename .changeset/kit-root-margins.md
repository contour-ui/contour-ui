---
'@contour-ui/react': patch
---

The roots of Alert, Card, Kbd and Table no longer set `margin: 0`. Their elements have no default margin, so nothing changes on its own, and a container, even one in a lower cascade layer, can now space them.
