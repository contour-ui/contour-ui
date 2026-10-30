# contour-ui

Design system for audio-plugin UIs and general web UI, built in layers: tokens and icons → core
(framework-agnostic logic) → `@contour-ui/headless-react` (unstyled) → `@contour-ui/react` (styled:
Essentials and Audio) → `@contour-ui/fumadocs` (a docs layout for fumadocs-core sites).

```bash
vp install
vp check && vp run boundaries
vp test
vp run -r build
vp run visual           # screenshot tests (the browser runs in Docker)
```

See [AGENTS.md](AGENTS.md) for the architecture, rules, commands and how to add a package.

## License

[MIT](LICENSE).
