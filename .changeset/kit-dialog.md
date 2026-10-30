---
'@contour-ui/react': minor
---

Add `Dialog`: the parts of the Headless Dialog (`Root`, `Trigger`, `Backdrop`, `Positioner`, `Content`, `Title`, `Description`, `CloseTrigger`) with the look of contour-ui, plus `Header`, `Body` and `Footer`. The backdrop is the overlay scrim; the content is a raised panel with a border, a shadow and the corners of a panel, in the middle of the viewport or near its top (`placement`), as wide as `size` allows (`sm`, `md`, `lg`) and no higher than the viewport, where a long body scrolls between the header and the footer. It grows in and fades out, and only fades under reduced motion; the overlay stacks above the page by `--ct-layer-overlay` and `--layer-index`. `CloseTrigger` is a small ghost x in the top end corner, or, with `asChild`, a button of yours that closes the dialog. The package now also exports `Portal`, for the overlay of a dialog.
