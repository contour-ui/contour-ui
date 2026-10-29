---
'@contour-ui/kit': minor
---

Add `CodeBlock`: `Root` (a `figure`), `Header` (its `figcaption`), `Title`, `CopyTrigger` and `Content` frame code highlighted by Shiki with its css-variables theme. The root maps the `--shiki-*` variables to the syntax color tokens, so the code follows the color theme, and is named by its title alone. `Content` scrolls long lines and is focusable, and styles Shiki's output: highlighted lines and words, added and removed lines, focused lines and line numbers. `CopyTrigger`, a small ghost icon button on the clipboard of `@contour-ui/headless-react`, copies the root's `value` or the text of the content, shows a check mark once the browser has written it, and announces the copy to screen readers; in a block without a title it sits at the top end, above the code.
