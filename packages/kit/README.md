# @contour-ui/kit

**Layer 3 — kit.** Styled general-purpose components (Button, Input, Select…),
built on `@contour-ui/headless` and styled with plain CSS + token CSS variables.
No Tailwind.

- **May depend on (internal):** `@contour-ui/headless`, `@contour-ui/tokens`, `@contour-ui/icons`.
- **Peers:** `react`, `react-dom`.
- **Entry points:** `@contour-ui/kit` (components), `@contour-ui/kit/styles.css` (load after `@contour-ui/tokens/tokens.css`).
- **Styles:** one file per component (`src/<component>/<component>.css`), imported by `src/styles.css` into the `contour.kit` cascade layer; `vp pack` bundles them into one `dist/styles.css`.
- **Storybook:** port 6103.
