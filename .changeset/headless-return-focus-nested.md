---
'@contour-ui/headless': patch
---

Focus goes back to the trigger when an overlay closes together with an overlay opened from it, such as a dialog and a popover portalled out of it: focus inside the nested layer, still in the DOM while it animates out, counts as inside the closing one, as it does for the focus trap, instead of being lost to the page once the nested layer unmounts. Focus in a layer above that stays open is left there.
