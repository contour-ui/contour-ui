---
'@contour-ui/react': patch
---

A labeled `Icon` after the text of a link or a button adds its label to the name as a separate word ("Fumadocs opens in a new tab", not "Fumadocsopens in a new tab"), even where `@contour-ui/react/styles.css` is not loaded: the `svg` carries the presentation attribute `display="inline-block"`, which every CSS rule overrides.
