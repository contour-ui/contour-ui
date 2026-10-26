# @contour-ui/core

**Layer 1 — logic.** Framework- and renderer-agnostic UI logic. No React, no DOM
(`lib` excludes `DOM`), except the `@contour-ui/core/react` subpath.

| Directory       | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| `machine/`      | state machine runtime (below)                              |
| `states/`       | reusable state machines; **never imports `interactions/`** |
| `interactions/` | pointer / keyboard logic; **never imports `states/`**      |
| `collection/`   | item collections that list machines navigate (below)       |
| `positioning/`  | where floating elements go, on Floating UI (below)         |
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

## Component machines (`states/`)

One namespace per component: its `machine`, `connect(service)` (the state and actions its parts
need, without a DOM) and its types (`Schema`, `Input`, `Api`…).

- `clipboard` — `idle`, `copying` and `copied`. `COPY` writes the value through the platform
  action `writeText`, which answers with `COPY.DONE` or `COPY.FAILED`; once the write is done the
  machine stays `copied` for `timeout` ms (3000 by default). A `COPY` while copied writes again
  and keeps the state; its `COPY.DONE` starts the time over.
- `dialog` — `closed` and `open`. `OPEN`, `CLOSE` and `TOGGLE` come from the parts; `ESCAPE` and
  `INTERACT_OUTSIDE` from the platform effect `dismiss`, and close only when `closeOnEscape` and
  `closeOnInteractOutside` allow it. With `open` controlled, requests are only reported through
  `onOpenChange` and the state follows the prop. While open, the platform effects `dismiss`,
  `trapFocus`, `preventScroll` and `hideOutside` run (`modal` turns the last three on); the
  platform actions `setInitialFocus` and `restoreFocus` move focus in on open and back on close.
- `listbox` — one state, `idle`; the events change the selection (`value`), the highlighted item
  (`highlightedValue`) and whether the list or its input has focus. `HIGHLIGHT.FIRST` / `LAST` /
  `NEXT` / `PREVIOUS` and `TYPEAHEAD` move the highlight over the enabled items of a list
  collection (`loopFocus` wraps around; `selectOnHighlight` selects too); `ITEM.CLICK`,
  `ITEM.SELECT` and `HIGHLIGHTED.SELECT` select (`selectionMode` `single` or `multiple`,
  `deselectable`), reported by `onSelect`; `ITEM.HOVER` and `POINTER.LEAVE` follow the pointer
  (`highlightOnHover`); `CONTENT.FOCUS`, `INPUT.FOCUS` and `BLUR` follow the focus. No platform
  actions, effects or delays. New items clear a highlight that is gone, or highlight the first
  item with `autoHighlight` while the listbox has focus.
- `popover` — `closed` and `open`, with the requests, dismissal and controlled `open` of `dialog`.
  While open, the platform effects `position` (writes the placement after `flip` to the
  `placement` field), `dismiss`, `trapFocus`, `preventScroll` and `hideOutside` (the last three
  when `modal`) and `keepTabOrder` (a portalled popover that is not modal stays in the Tab order
  after its trigger) run. Opening moves focus in (`setInitialFocus`, with `autoFocus`); a popover
  that starts open leaves focus alone.
- `toc` — one state, `observing`, with the platform effect `observeHeadings`, which reports each
  heading as `above`, `inside` or `below` the observed area (`VISIBILITY.CHANGE`). The headings
  inside are active, in the order of `items`; when none is, the last one above stays active.
  `activeIds` may be controlled; `SCROLL_TO` asks the platform action `scrollToHeading` to scroll;
  new `items`, `rootMargin` or `threshold` restart the observation.

```ts
import { clipboard, createService } from '@contour-ui/core';

const service = createService(clipboard.machine, { props: { value: 'npm i' }, platform });
service.start();
clipboard.connect(service).copy();
```

## Collections (`collection/`)

- `createListCollection({ items, itemToValue, itemToString, isItemDisabled, groupBy })` — an
  immutable list of items: a string is its own value and text, an object gives `value`, `label`
  and `disabled`. Every item needs a value of its own. With `groupBy`, the items come group by
  group (`groups`), in the order the groups first appear. It gives the first, last, next and
  previous enabled values, with or without `loop`, and `search(query, { from })`, the typeahead
  match: one character (or the same one again) moves on past `from`, more characters refine the
  match from `from` itself, ignoring case (`toLowerCase`, no `localeCompare`).

## Interactions (`interactions/`)

Input turned into intent, as pure functions of plain data (`KeyLike`: `key` and the modifiers).
The adapter reads the intent of an event and sends its machine an event of its own.

- `getListIntent(event, { orientation, dir })` — `first`, `last`, `next` or `previous`: ↓ ↑ (→ ←
  in a horizontal list, swapped right to left), Home, End; `null` for other keys and for keys
  with Ctrl, Alt or Meta.
- `nextTypeahead(state, event, now, { timeout })` — the typeahead query: the characters typed less
  than `timeout` ms apart (500 by default). Core has no clock: the adapter passes `now`, such as
  the time stamp of the key event, and keeps the state. Space counts only within a query, so that
  it can select otherwise.

## Positioning (`positioning/`)

Where a floating element (a popover, a menu) goes next to its reference, computed by Floating UI
with the platform the adapter passes: the DOM measures elements, another renderer its nodes,
tests plain rectangles.

- `computePosition(reference, floating, { ...options, platform, compute })` — the options
  (`placement`, `offset`, `flip`, `shift`, `sameWidth`, `fitViewport`, `strategy`) become
  middleware. The result is plain data: the coordinates, the placement after `flip`, the sizes,
  the transform origin and the CSS variables `--reference-width`, `--reference-height`,
  `--available-width`, `--available-height` and `--transform-origin`. `compute` is the
  `computePosition` of the Floating UI package the platform comes from (`@floating-ui/core`'s by
  default; the DOM passes `@floating-ui/dom`'s).
- `resolvePositioningOptions(...layers)` — the options with every default filled in; a later
  layer wins, as a component puts its owner's options over its own defaults.

## `@contour-ui/core/react`

Hooks shared by every renderer adapter: React only, no `react-dom`.

- `useMachine(machine, props, platform)` — runs a machine in a component: creates the service
  once, passes the props on every render, runs `watch` actions after the commit, starts the
  machine after mount and stops it on unmount (Strict Mode's extra mount included), and
  re-renders when the snapshot changes. Returns the service for the component's `connect`.

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
