---
'@contour-ui/headless-react': minor
---

Add `Clipboard`: `Root`, `Trigger` and `Indicator` parts on the clipboard machine of `@contour-ui/core`, with `navigator.clipboard.writeText` and a `setTimeout` clock. The clipboard is copied only once the browser has written the value; every part then carries `data-copied`. The trigger is named "Copy to clipboard" by default and keeps its name while copied; the root renders a visually hidden `role="status"` element that announces `copiedMessage` ("Copied to clipboard") after a written copy. `useClipboard` and `useClipboardContext` give the same API to parts of your own.
