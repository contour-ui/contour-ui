---
'@contour-ui/headless-react': patch
---

A dialog that opens scrolls its initial focus into view: `initialFocusEl()` or the first tabbable element, focused without scrolling the page, used to stay below the fold of a scrolling body. Once focus has moved in, the scroll container inside the content that holds it scrolls to it (the way a popover does once placed), and nothing outside the content moves. The styled Dialog and Drawer (`@contour-ui/react`) get it through the Headless Dialog.
