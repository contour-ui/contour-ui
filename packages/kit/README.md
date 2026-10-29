# @contour-ui/kit

**Layer 3 — kit.** Styled general-purpose components (Button, Input, Select…),
built on `@contour-ui/headless-react` and styled with plain CSS + token CSS variables.
No Tailwind.

- **May depend on (internal):** `@contour-ui/headless-react`, `@contour-ui/tokens`, `@contour-ui/icons`.
- **Peers:** `react`, `react-dom`.
- **Entry points:** `@contour-ui/kit` (components), `@contour-ui/kit/styles.css` (load after `@contour-ui/tokens/tokens.css`), `@contour-ui/kit/theme-script` (`themeScript()` without React, for code that runs before it, such as a root layout on the server).
- **Styles:** one file per component (`src/<component>/<component>.css`), imported by `src/styles.css` into the `contour.kit` cascade layer; `vp pack` bundles them into one `dist/styles.css`.
- **Storybook:** port 6103.

## React Server Components

Kit works in React Server Components (Next.js App Router). `vp pack` builds it one file per
module, and the modules that need the browser start with `'use client'`: overlays, contexts,
`ThemeProvider`, the code block, the close triggers. The others stay server modules: the entry
point, the namespaces (`Card`, `Table`, `Dialog`…), and the parts that only render markup, such
as `Button`, `Kbd`, `Link`, `Icon`, `Card.*` and `Table.*`, which render on the server. So a
server component imports from `@contour-ui/kit` directly and uses `Card.Root` or `Dialog.Root`:

```tsx
import { Card } from '@contour-ui/kit';

export default function Page() {
  return (
    <Card.Root>
      <Card.Title>Server</Card.Title>
    </Card.Root>
  );
}
```

Props that go from a server component to a client part must be serializable: data, React nodes
and components, never functions (`onClick`, `onOpenChange`). Code with handlers or state goes in
a client module of your own. `src/client-boundary.test.ts` checks the directives (Vitest project
`kit:node`).
