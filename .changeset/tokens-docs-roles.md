---
'@contour-ui/tokens': minor
---

Add the `violet`, `cyan` and `orange` palette hues, the DTCG `shadow` type, and new roles: `color.overlay.scrim`, `color.syntax.*` (named after Shiki's `css-variables` theme), `shadow.raised`, `shadow.overlay`, `layer.sticky`, `layer.overlay`, `motion.exit`, and the long-form text styles `display`, `title`, `subtitle`, `prose` and `code`. Palette colors are now written with their gamut-mapped oklch coordinates, so a few light and dark stops shift slightly to stay inside sRGB and match their hex fallbacks.
