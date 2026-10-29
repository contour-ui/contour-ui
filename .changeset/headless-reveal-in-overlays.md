---
'@contour-ui/headless-react': patch
---

Lists that open in an overlay show their current item. `Toc.Indicator` is `hidden` while the list is not laid out, as in a closed popover, and shows in place once it is, without transitioning from an earlier box; `autoScroll` also scrolls the first active item into view, at once, when the list is laid out. `Popover` scrolls a content that scrolls to the element it focuses as it opens, once the content has its first position and so its size, and never scrolls anything outside the content. Scrolling an item into its container (Listbox, Toc, Popover) measures in the container's layout pixels, so a container still scaling in as it opens scrolls as far as it should.
