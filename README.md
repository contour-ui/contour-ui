# contour-ui

Design system for audio-plugin UIs and general web UI, built in layers
(tokens/icons → core → headless-react → kit → fumadocs, a docs layout for fumadocs-core sites).

```bash
vp install
vp check && vp run boundaries
vp test
vp run -r build
vp run storybook        # composed Storybook on http://localhost:6100
vp run visual           # screenshot tests (Docker)
```

See [AGENTS.md](AGENTS.md) for the architecture, rules, commands and how to add a package.

## License

[MIT](LICENSE).
