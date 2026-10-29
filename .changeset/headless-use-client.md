---
'@contour-ui/headless-react': minor
---

Work under React Server Components: the package is built one file per module, and the modules that
need the browser (hooks, contexts, the parts that read them, `Portal`, `Presence`) start with
`'use client'`. The entry point, the namespaces, `Primitive`, `mergeProps` and `composeRefs` stay
server modules.
