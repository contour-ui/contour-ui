---
'@contour-ui/icons': minor
---

Icons now ship as data: the first Lucide icons and the GitHub logo as normalized SVG paths (`d`) and numeric canvas commands, one `<camelName>Icon` export each, plus `drawIcon` for any Canvas 2D context (no DOM types, no `Path2D` needed). The placeholder `placeholderIcon` / `IconDefinition` exports are removed.
