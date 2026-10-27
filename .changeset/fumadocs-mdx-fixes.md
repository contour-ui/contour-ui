---
'@contour-ui/fumadocs': patch
---

The MDX code block drops the `icon` prop that Fumadocs' `rehypeCode` adds unless its options say `icon: false`, rather than leaving an SVG string on the `pre` as an attribute. An MDX `Card` that links to another site ends its name with "(opens in a new tab)", in visually hidden text, as the other links to another site do.
