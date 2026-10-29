---
'@contour-ui/core': minor
---

Add the tabs machine, exported as the `tabs` namespace: `tabs.machine`, `tabs.connect` (`value`, `focusedValue`, `triggers`, `tabStopValue`, `getTriggerState()`, `getContentState()`, `setValue()`, `focus()`, `focusFirst()`, `focusLast()`, `focusNext()`, `focusPrevious()`) and its types. The adapter passes the triggers in order as `triggers`; `FOCUS.NEXT`, `FOCUS.PREVIOUS`, `FOCUS.FIRST` and `FOCUS.LAST` move focus over the enabled ones (wrapping around with `loopFocus`, on by default) through the platform action `focusTrigger`, and select in the `automatic` activation mode (the default); `TRIGGER.CLICK` selects in both modes and `VALUE.SET` selects any value. Focus alone never selects. Without a value no tab is selected; the tab stop is the selected trigger, or the first enabled one.
