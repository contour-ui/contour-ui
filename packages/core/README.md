# @contour-ui/core

**Layer 1 — logic.** Framework- and renderer-agnostic UI logic. No React, no DOM
(`lib` excludes `DOM`).

| Directory       | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| `machine/`      | tiny finite-state machine                                  |
| `states/`       | reusable state machines; **never imports `interactions/`** |
| `interactions/` | pointer / keyboard logic; **never imports `states/`**      |
| `scales/`       | value scales (linear, log, dB…)                            |
| `format/`       | value formatting / parsing                                 |
| `react/`        | `@contour-ui/core/react` subpath (future `useMachine`)     |

- **May depend on (internal):** nothing.
- **Peers:** `react` — optional, used only by `@contour-ui/core/react`.
