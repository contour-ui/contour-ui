# contour-ui

Design system for audio-plugin UIs and general web UI, built in layers: tokens, icons and fonts →
core (framework-agnostic logic) → `@contour-ui/headless-react` (unstyled) → `@contour-ui/react`
(styled: Essentials and Audio) → `@contour-ui/fumadocs` (a docs layout for fumadocs-core sites).

```bash
pnpm install            # also installs vp, the Vite+ CLI of the workspace
pnpm vp check && pnpm vp run boundaries
pnpm vp test
pnpm vp run -r build
pnpm vp run visual      # screenshot tests (the browser runs in Docker)
```

`vp` is the `vite-plus` devDependency (`node_modules/.bin/vp`), so Vite+ needs no global install.
With the global Vite+ CLI, drop the `pnpm` prefix: it runs the same local version.

See [AGENTS.md](AGENTS.md) for the architecture, rules, commands and how to add a package.

## License

[MIT](LICENSE).
