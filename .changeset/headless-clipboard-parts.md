---
'@contour-ui/headless': minor
---

Add `Label`, `Control` and `ValueText` to `Clipboard`. `Clipboard.ValueText` (a `span`) shows the value as it changes, or its children in its place. `Clipboard.Control` (a `div`) holds the value text and the trigger, to lay them out as one row. `Clipboard.Label` (a `span`) names the clipboard: while it is mounted, the root is a `group` with `aria-labelledby` pointing to its id, generated unless you pass one; a root you name with `aria-label` or `aria-labelledby` is a `group` too. Every new part carries `data-copied`. `useClipboard` returns `getLabelProps()`, `getControlProps()` and `getValueTextProps()`, and the attribute types of the parts are exported (`ClipboardRootAttributes`, `ClipboardLabelAttributes`, `ClipboardTriggerAttributes`, `ClipboardStatusAttributes`, `ClipboardPartAttributes`). The existing parts work as before.
