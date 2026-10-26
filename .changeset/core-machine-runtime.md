---
'@contour-ui/core': minor
---

Add the state machine runtime: `createMachine` (states, guarded transitions, entry and exit actions, delayed transitions, effects by name, owned or controlled context, `watch`), the pure `transition`, `createService`, which carries out commands through a `Platform` that also provides the clock (`schedule(ms, fire, delay)`), and `createTestPlatform` with a fake clock for tests. A transition completes even when one of its actions or effects throws; the first error is rethrown afterwards. The placeholder `useMachine` is gone from `@contour-ui/core/react`.
