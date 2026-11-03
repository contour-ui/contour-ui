# @contour-ui/typescript-config

Private, never published. Shared `tsconfig` presets:

| Preset                 | Use for                                                                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base.json`            | Strict defaults + the `@contour-ui/source` custom condition                                                                                                           |
| `library.json`         | Published, DOM-free packages (`core`, `tokens`, `icons`)                                                                                                              |
| `library-dom.json`     | Published React DOM packages (`headless-react`, `react`, `fumadocs`)                                                                                                  |
| `library-soundor.json` | Soundor builds (`tsconfig.soundor.json` of the cross-platform packages, the Soundor sandbox): no DOM, the `soundor` condition; list `@soundor/environment` in `types` |
| `app.json`             | Vite + React apps                                                                                                                                                     |
| `node.json`            | Node scripts and config files                                                                                                                                         |

Library presets enable `isolatedDeclarations`, so `vp pack` can emit `.d.ts`
files per module without a full type-check.
