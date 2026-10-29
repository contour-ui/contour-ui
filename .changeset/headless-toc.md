---
'@contour-ui/headless-react': minor
---

Add `Toc`: `Root` (a `nav`), `Title`, `List`, `Item`, `Link` and `Indicator` parts on the toc machine of `@contour-ui/core`. Two `IntersectionObserver`s watch the headings in their scroll container or the page, so a jump past several headings is seen too; items and links of active headings carry `data-active`, and the link of the first one `aria-current="true"`. A click on a link scrolls to its heading (`scrollBehavior`: smooth, or `auto` when the user prefers reduced motion), moves focus there and puts its id in the address with `history.replaceState`. The indicator gets the box around the active items as `--top`, `--left`, `--width` and `--height`, and `autoScroll` keeps the first active item in view in the panel that scrolls the list, never scrolling the page. The title names the `nav` while it is mounted. `useToc` and `useTocContext` give the same API to parts of your own.
