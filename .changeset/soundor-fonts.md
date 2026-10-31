---
'@contour-ui/soundor': minor
---

Add `registerFonts()`: it registers the TTF faces of `@contour-ui/fonts` (IBM Plex Sans and JetBrains Mono at 400, 500 and 600) with Soundor's `registerFont`, so text in the token text styles is drawn in the token fonts. Call it once before `render()`; a plugin that never calls it ships none of the files.
