---
'@contour-ui/tokens': minor
---

`docs.json` gives each value as DTCG data beside its CSS: `themes.<theme>.dtcg` holds the resolved value (a color with its `alpha` and sRGB `hex`, a dimension as `{ value, unit }`, a transition with its curve). A new `contrast` list gives every color pair the build checks, with its kind (`text` or `ui`), its least ratio and its WCAG 2 ratio in each theme, so a token reference reads numbers instead of parsing CSS.
