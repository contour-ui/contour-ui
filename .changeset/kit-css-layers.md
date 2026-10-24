---
'@contour-ui/kit': minor
'@contour-ui/audio': minor
---

Kit and Audio styles now sit in the `contour.kit` and `contour.audio` cascade layers, so unlayered app CSS overrides them without specificity tricks. Each package still ships a single `styles.css`.
