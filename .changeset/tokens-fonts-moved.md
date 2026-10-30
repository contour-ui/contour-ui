---
'@contour-ui/tokens': minor
---

Move `fonts.css` to `@contour-ui/fonts`: import `@contour-ui/fonts/fonts.css` in place of `@contour-ui/tokens/fonts.css`. The tokens package no longer depends on `@fontsource/ibm-plex-sans` and `@fontsource/jetbrains-mono`, so its consumers download no font files.
