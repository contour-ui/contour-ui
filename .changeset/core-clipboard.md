---
'@contour-ui/core': minor
---

Add the clipboard machine, exported as the `clipboard` namespace: `clipboard.machine`, `clipboard.connect` (`copied`, `value`, `copy()`, `setValue()`) and its types. `COPY` moves from `idle` to `copying` while the platform action `writeText` writes the value; the platform answers with `COPY.DONE`, which starts the `copied` state for `timeout` milliseconds (3000 by default), or `COPY.FAILED`, which returns to `idle`. A copy while copied keeps the state and starts the time over once its write is done. `onStatusChange({ copied })` reports the start and the end of the copied state, never a copy that was not written; `VALUE.SET` changes the value, owned or controlled.
