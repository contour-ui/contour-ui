# @contour-ui/core

**Layer 1 — logic.** Framework- and renderer-agnostic UI logic. No React, no DOM
(`lib` excludes `DOM`), except the `@contour-ui/core/react` subpath.

| Directory       | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| `machine/`      | state machine runtime (below)                              |
| `states/`       | reusable state machines; **never imports `interactions/`** |
| `interactions/` | pointer / keyboard logic; **never imports `states/`**      |
| `scales/`       | value scales (linear, log, dB…)                            |
| `format/`       | value formatting / parsing                                 |
| `react/`        | `@contour-ui/core/react` subpath: React hooks (see below)  |

- **May depend on (internal):** nothing.
- **Peers:** `react` — optional, used only by `@contour-ui/core/react`.

## Machines (`machine/`)

A machine is data plus pure functions; a service runs it; the platform gives it the environment.

- `createMachine<Schema>(config)` — states with `on` transitions (`target`, `guard`, `actions`,
  `reenter`), `entry` / `exit` actions, delayed transitions (`after`), and effects by name. The
  context holds values the machine owns or that a prop controls (`value` / `defaultValue` /
  `onChange`). The definition is checked when it is created.
- `transition(machine, state, event, reads)` — pure: the next state and the commands that get
  there (run an action, start or stop an effect, schedule or cancel a delay). It runs nothing.
- `createService(machine, { props, platform })` — keeps the state and context, carries out the
  commands through the platform, handles events one at a time, and calls subscribers once per
  event. `setProps` is safe during render; `syncProps` runs `watch` actions; `start` / `stop`.
- `Platform` — what the adapter gives: `schedule(ms, fire) → cancel` (core has no clock and no
  globals), the platform actions (`writeText`) and effects (`dismiss`) the machine names.
- `createTestPlatform(machine)` — a fake clock (`advance(ms)`) and a log of the platform actions
  and effects, for tests without a DOM or real time.

## `@contour-ui/core/react`

Hooks shared by every renderer adapter: React only, no `react-dom`.

- `useControllableState({ value, defaultValue, onValueChange, isEqual })` — state that the owner
  of a component may control (`value`) or leave to the component (`defaultValue`). Returns
  `[value, setValue]` like `useState`: the setter is stable, takes a value or an updater, and
  reports every change as `onValueChange({ value })`. A value equal to the current one
  (`isEqual`, `Object.is` by default) is dropped.

```ts
const [open, setOpen] = useControllableState({
  value: props.open,
  defaultValue: props.defaultOpen ?? false,
  onValueChange: ({ value }) => props.onOpenChange?.({ open: value }),
});
```

## Tests and types

Tests in `src/react/` run in Chromium (Vitest browser mode, project `core:react`); the rest run in
Node (project `core`). `tsconfig.json` holds the shared options and references the projects that
own the files: `tsconfig.lib.json` (sources and Node tests, no DOM), `tsconfig.react-test.json`
(the browser tests, with DOM) and `tsconfig.config.json` (`vite.config.ts`).
