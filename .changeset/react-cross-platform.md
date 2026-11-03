---
'@contour-ui/react': minor
---

Run `Button` and `Knob` in Soundor plugin UIs from the same sources as on the web, through the Soundor build of the package (the `soundor` export condition): there they draw with the token values of the theme, from the Soundor `ThemeProvider` (`ThemeProvider`, `useTheme`), and `registerFonts()` registers the TTF faces of `@contour-ui/fonts` (now a dependency). On the web they render the same DOM as before. A user's `style` on Soundor may be a function of the state, as Soundor's `Pressable` takes it. `react-dom` is now an optional peer. They replace the `Button` and `Knob` of `@contour-ui/soundor` and the `Knob` of `@contour-ui/soundor-headless`, which are gone.
