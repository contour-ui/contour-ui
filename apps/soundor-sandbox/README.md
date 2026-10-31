# @contour-ui/app-soundor-sandbox

A Soundor plugin that shows the components of `@contour-ui/soundor`: every variant and size, in
both themes. Private, never published. It runs natively (the JUCE runtime, a Standalone app: the
UI on Hermes, drawn by Skia) and in the browser (the web runtime, which draws Soundor nodes with
DOM elements).

The Soundor CLI bundles the UI itself, from the built packages (`dist`), not from their sources:
build them first.

```sh
vp run --filter @contour-ui/soundor... build   # the package and the packages it uses
vp -C apps/soundor-sandbox run dev:web          # http://localhost:5173
vp -C apps/soundor-sandbox run dev:juce         # needs JUCE 8 or 9 (~/JUCE, or JUCE_DIR)
vp -C apps/soundor-sandbox run doctor           # checks the toolchain of both runtimes
```

`dev:juce` prints a "DevTools session file"; with it, Soundor Driver reads and drives the running
app, and captures what the engine draws:

```sh
export SOUNDOR_DEVTOOLS_SESSION=/path/printed/by/dev.json
npx soundor driver tree --json
npx soundor driver key Tab
npx soundor driver screenshot ./sandbox.png
```

Every button has a `debugId` (`solid-md`, `outline-disabled`, `theme`…) to find it by.

- `runtimes/juce/` and `runtimes/web/` are the scaffolds of `soundor init juce` and
  `soundor init web`, kept as written but for lint fixes. The JUCE template applies a `gain`
  parameter, so the config declares one.
- `.soundor/` (generated declarations, bundles, builds) is git-ignored.
