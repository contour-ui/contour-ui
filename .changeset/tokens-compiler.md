---
'@contour-ui/tokens': patch
---

The package is built by `vp pack` with the new private `@contour-ui/tokens-compiler`, which checks the design rules (contrast pairs, palette steps, gamut, Soundor values) on every build. What it ships is unchanged, apart from the declarations: the types of `@contour-ui/tokens` are in `index.d.ts` itself, and `soundorTokens` is typed `Readonly<Record<'dark' | 'light', SoundorTokens>>`, the same type as before written out.
