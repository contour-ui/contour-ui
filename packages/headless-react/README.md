# @contour-ui/headless-react

**Layer 2 — headless.** Unstyled React DOM components and hooks (Ark UI–like
anatomy: `Component.Part`, `data-scope` / `data-part` attributes).

- **May depend on (internal):** `@contour-ui/core`.
- **Must not depend on:** `tokens`, `icons`, `kit`, `audio`.
- **Peers:** `react`, `react-dom`.
- **Storybook:** unstyled behavior stories (`vp run storybook`, port 6102).

## React Server Components

`vp pack` builds the package one file per module, and the modules that need the browser start
with `'use client'`: the hooks of components, their contexts and the parts that read them,
`Portal`, `Presence`. The entry point, the namespaces (`Dialog`, `Popover`…), `Primitive`,
`mergeProps` and `composeRefs` stay server modules: a server component imports
`@contour-ui/headless-react` and renders `Dialog.Root` or `Primitive.div` (with `asChild` too). Hooks
run in client modules only. `src/client-boundary.test.ts` checks the directives (Vitest project
`headless-react:node`).

## Building parts

Parts render through `Primitive.<element>` (`Primitive.div`, `Primitive.button`, …). With
`asChild`, a part renders its only child instead, for example a router link in place of `<a>`,
and merges its props into the child's. The same helpers are exported for your own parts:

- `mergeProps(...sources)` combines prop objects: event handlers all run (the last source's
  first), class names are joined, styles are merged, and for anything else the last value wins.
- `composeRefs(...refs)` makes one callback ref that feeds several refs, with React 19 ref
  cleanups; `useComposedRefs(first, second)` does the same inside a component and keeps the
  result stable between renders.
