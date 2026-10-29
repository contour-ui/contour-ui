---
'@contour-ui/fumadocs': minor
---

Add `search` to `HomeLayout`: `false` leaves the search button out of its header, and the shortcut
still opens the search. The header now lays its content out in the column of the page: the root
sets `--contour-docs-home-width` (`80rem`), and the header centers its content in it, with at least
the page inset at its sides, so the brand and the buttons line up with a column of the page that
reads the same variables. The brand stays at the start; the `nav` links, now the navigation "Main"
(a list of Kit's neutral links in `--ct-text-nav`, in the color of the brand, underlined on hover),
the search, the icon links and the theme toggle sit at the end. The header has no divider; it is
`4.5rem` high from 48rem and keeps `3rem` on phones, where the `nav` links scroll sideways in their
own box when the header runs out of room.
