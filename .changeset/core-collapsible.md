---
'@contour-ui/core': minor
---

Add the collapsible machine, exported as the `collapsible` namespace: `collapsible.machine`, `collapsible.connect` (`open`, `disabled`, `setOpen()`, `toggle()`) and its types. `OPEN`, `CLOSE` and `TOGGLE` move it between `closed` and `open` and report each change as `onOpenChange({ open })`, never a request for the state it is in; while `disabled`, requests are ignored. With `open` controlled, requests are only reported and the state follows the prop, disabled or not; otherwise it starts from `defaultOpen`. It asks nothing of the platform.
