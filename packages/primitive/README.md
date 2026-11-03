# @contour-ui/primitive

**Layer 2 — elements.** The elements contour-ui parts are made of, written once in web words
(`Primitive.div`, `Primitive.button`, `role`, `aria-*`, `tabIndex`, `onPointerDown`), and the
platform services of their input (drag, wheel, focus, hover and press). It is the only package with
code for particular platforms: one build per platform, picked by the export conditions of the
app's bundler.

| Platform           | Condition | Elements                                                                             |
| ------------------ | --------- | ------------------------------------------------------------------------------------ |
| Web                | default   | React DOM: the props pass through as they are, `asChild` on every element            |
| Soundor plugin UIs | `soundor` | `@soundor/react`: `View`, `Text`, `Pressable`, `Svg`…, the web vocabulary translated |

- **May depend on (internal):** `@contour-ui/core`.
- **Must not depend on:** any package above it, `tokens`, `icons`, `fonts`.
- **Peers:** `react`; the renderers, optional: `react-dom` (web), `@soundor/react` (Soundor).

A Soundor plugin's TypeScript and bundler need the `soundor` condition
(`"customConditions": ["soundor"]`), so that they read the Soundor build.
