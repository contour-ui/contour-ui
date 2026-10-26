---
'@contour-ui/core': minor
---

Add the state machine runtime: `createMachine` (states, guarded transitions, entry and exit actions, delayed transitions, effects by name, owned or controlled context, `watch`), the pure `transition`, `createService`, which carries out commands through a `Platform` that also provides the clock, and `createTestPlatform` with a fake clock for tests. The placeholder `useMachine` is gone from `@contour-ui/core/react`.
