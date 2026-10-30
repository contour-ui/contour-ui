---
'@contour-ui/fonts': minor
---

Add `@contour-ui/fonts`, the font files of the type tokens: IBM Plex Sans and JetBrains Mono at 400, 500 and 600, from Fontsource 5.3.0 (SIL OFL 1.1). `@contour-ui/fonts/fonts.css` declares the WOFF2 faces for the web, split by `unicode-range` (Latin, Latin Extended, Cyrillic, Cyrillic Extended, Greek, Vietnamese), so a browser fetches only the subsets a page uses. `@contour-ui/fonts/ttf/*` holds a static TTF of the Latin subset per face, for runtimes that register fonts by file, such as Soundor's `registerFont()`, and `fontFaces` lists them (`family`, `weight`, `style`, `file`). Each family's license ships unmodified under `@contour-ui/fonts/licenses/*`.
