---
'@contour-ui/react': minor
---

Work under React Server Components: the package is built one file per module, and the modules that
need the browser start with `'use client'`. A server component imports `@contour-ui/react` directly;
the parts that only render markup (`Button`, `Kbd`, `Link`, `Icon`, `Card`, `Table`…) render on the
server, and namespaces such as `Card` stay server modules, so `Card.Root` works there.
