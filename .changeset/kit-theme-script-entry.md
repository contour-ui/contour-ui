---
'@contour-ui/kit': minor
---

Add the `@contour-ui/kit/theme-script` entry point: `themeScript()` without React or any component, for code that runs before React does, such as the root layout of Next.js, a React Server Component, which must not load the components. `themeScript` stays in the main entry too.
