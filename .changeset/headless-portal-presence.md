---
'@contour-ui/headless-react': minor
---

Add `Portal` and `Presence`, the building blocks of overlays. `Portal` renders its children at the end of `document.body`, or into a `container` (an element or a ref to one, read after each commit), or in place with `disabled`; it renders nothing on the server and in the hydration render, so the markup matches, and the children right after. `Presence` renders a `div` with `data-state="open"` or `"closed"` from `present`, keeps it on screen, `inert`, while the closed state runs a CSS exit animation on the element itself, then hides it (`hidden`) or unmounts it (`unmountOnExit`); `lazyMount` waits for the first `present`, `present` during the exit cancels it, and `onExitComplete` reports each close. `usePresence` gives the same logic to parts that render their own element: `mounted`, `visible`, the `ref` of the animated element and `getPresenceProps()`.
