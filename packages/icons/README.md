# @contour-ui/icons

**Layer 0 — foundation.** Icons as renderer-independent data: [Lucide](https://lucide.dev)
icons and brand logos from [Simple Icons](https://simpleicons.org), compiled into normalized
paths for SVG and Canvas 2D, plus `drawIcon` for canvas. No React and no DOM: the kit's `Icon`
component renders the data as `<svg>`, and canvas-based UIs (Soundor) draw it with `drawIcon`.

- **May depend on (internal):** nothing.
- **Storybook:** none (the kit shows the icon set).

## Usage

```ts
import { copyIcon, drawIcon } from '@contour-ui/icons';

// SVG: one <path> per entry, on a 0 0 24 24 viewBox.
copyIcon.paths.map((path) => path.d); // ['M10 8L20 8C21.105 8 22 8.895 …Z', …]

// Canvas 2D: the 24 grid scaled to `size` at x, y.
drawIcon(ctx, copyIcon, { x: 8, y: 8, size: 16, color: '#fff' });
```

Every icon is its own `<camelName>Icon` export (`search` → `searchIcon`, `chevron-right` →
`chevronRightIcon`, `github` → `githubIcon`), so bundlers drop the unused ones.

## Data format

```ts
interface IconData {
  readonly name: string; // Lucide name or Simple Icons slug: 'chevron-right', 'github'
  readonly size: 24; // grid: viewBox 0 0 24 24
  readonly strokeWidth: number; // for the stroked paths (Lucide: 2); 0 when all paths are filled
  readonly paths: readonly IconPath[]; // in drawing order
}

interface IconPath {
  readonly d: string; // absolute M, L, C, Q, Z only
  readonly commands: readonly number[]; // the same path as numbers
  readonly fill: boolean; // true: filled, no stroke (logos); false: stroked
}
```

- **`d`** uses only absolute `M`, `L`, `C`, `Q` and `Z`: shapes (`circle`, `rect`, …) are
  converted to paths, arcs to cubic curves, `H` / `V` to `L`, `S` / `T` to full curves.
  Coordinates are rounded to 3 decimals.
- **`commands`** holds the same path for canvases without `Path2D` or a path-string parser:
  an opcode from `PathCommand` (`M: 0`, `L: 1`, `C: 2`, `Q: 3`, `Z: 4`) followed by its
  coordinates (`M x y`, `L x y`, `C x1 y1 x2 y2 x y`, `Q x1 y1 x y`, `Z`), then the next one.
- **Stroked paths** follow Lucide's SVGs: `fill="none"`, `stroke="currentColor"`, the icon's
  `strokeWidth`, round caps and joins. **Filled paths** (logos) use `fill="currentColor"` and
  no stroke. A Lucide shape that is filled and stroked (a few small dots) comes as two paths
  with the same `d`: filled, then stroked.

## `drawIcon`

```ts
drawIcon(ctx, icon, { x, y, size, color, strokeWidth });
```

| Option        | Default            | Meaning                                                                |
| ------------- | ------------------ | ---------------------------------------------------------------------- |
| `x`, `y`      | `0`                | top-left corner of the icon box, in context units                      |
| `size`        | `24`               | width and height of the box                                            |
| `color`       | the context styles | color of strokes and fills; otherwise `strokeStyle` / `fillStyle` stay |
| `strokeWidth` | `icon.strokeWidth` | on the 24 grid: scales with `size`, like SVG `stroke-width`            |

`ctx` is any object with the Canvas 2D methods it calls (`IconContext`: `beginPath`, `moveTo`,
`lineTo`, `bezierCurveTo`, `quadraticCurveTo`, `closePath`, `stroke`, `fill`, `save`,
`restore`, `translate`, `scale`, and the `lineWidth`, `lineCap`, `lineJoin`, `strokeStyle`,
`fillStyle` properties). The browser's `CanvasRenderingContext2D` fits, and so does a canvas
without `Path2D`. The context's transform and styles are restored afterwards.

## Adding an icon

1. Add the Lucide name (as on [lucide.dev/icons](https://lucide.dev/icons); renamed icons only
   by their current name) to `LUCIDE_ICONS`, or a Simple Icons slug to `SIMPLE_ICONS`, in
   [`scripts/icon-list.ts`](scripts/icon-list.ts).
2. Regenerate the data: `vp run --filter @contour-ui/icons icons` → `src/generated/icons.ts`.
3. Commit both. `vp test` fails when the generated file does not match the list
   (`src/generated.test.ts`).

`scripts/build-icons.ts` reads the shapes from `lucide-static/icon-nodes.json` and the grid and
stroke settings from the icon's SVG; logos come from `simple-icons/icons/<slug>.svg`. The
conversion (`scripts/path-data.ts`, with [svgpath](https://github.com/fontello/svgpath)) fails
on anything it would otherwise drop, such as an unknown element or attribute.

## Sources and licenses

- **Lucide** (ISC; the icons derived from Feather: MIT). The path data is copied as-is, so the
  license ships with the package in [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).
- **Simple Icons** (CC0-1.0): no notice needed. The build refuses a logo that Simple Icons lists
  under another license. Logos remain trademarks of their owners; follow the brand guidelines
  linked from each export's doc comment.
- `lucide-static`, `simple-icons` and `svgpath` are build-time dev dependencies; consumers get
  only the generated data.
