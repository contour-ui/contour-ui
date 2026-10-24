---
'@contour-ui/tokens': patch
---

Palette colors now stay inside sRGB: each one is written with its gamut-mapped coordinates, so the CSS value and its hex fallback are the same color. Some blue, red, green and yellow stops shift slightly, below the just-noticeable difference.
