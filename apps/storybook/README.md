# @contour-ui/app-storybook

Private. Storybook **composition host**: one site that references
each package Storybook via [Storybook refs](https://storybook.js.org/docs/sharing/storybook-composition).

| Package        | Dev port | Production path   |
| -------------- | -------- | ----------------- |
| tokens         | 6101     | `/tokens`         |
| headless-react | 6102     | `/headless-react` |
| kit            | 6103     | `/kit`            |
| fumadocs       | 6105     | `/fumadocs`       |

- `vp run storybook` (repo root) — starts every package Storybook plus this host (port 6100).
  The host waits for the package Storybooks first (`scripts/wait-for-refs.ts`): Storybook checks
  refs once at startup, and a ref that is not up yet never loads in dev.
  Open http://localhost:6100 and navigate from the sidebar; a direct link or page reload on a
  ref's story can hang in dev (cross-origin composition in Storybook 10.6; the static build is fine).
- The Theme toolbar menu (tokens, kit, fumadocs) works in each package Storybook. The host
  does not show it: Storybook does not pass globals to refs, so composed stories render in the
  default theme.
- `vp run build-storybook` (repo root) — builds all package Storybooks and this host into
  `apps/storybook/storybook-static/`, a single deployable folder.

## Visual tests

Playwright screenshots every story tagged `visual` (all stories of `tokens`, `kit` and
`fumadocs`; `tags: ['!visual']` opts out) in each theme, from `storybook-static/`:
`visual/__snapshots__/<storybook>/<story id>.<theme>.png`. Stories show at 1280×720, a story tagged
`phone` at 390×844 (its Storybook's `phone` viewport, which story tests take from its globals).

| Command (repo root)    | What it does                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `vp run visual`        | build the Storybooks and `@contour-ui/tokens`, compare with the committed screenshots  |
| `vp run visual:update` | the same, rewriting screenshots that changed or are missing; review them before commit |

- Both run `playwright test` in `mcr.microsoft.com/playwright:v<@playwright/test version>-noble`
  (`scripts/visual.ts`, Docker required), as `linux/amd64` like GitHub's runners (emulated on
  Apple silicon). CI's `visual` job runs in the same image (`visual:ci`) and uploads the report with
  diffs when screenshots differ. Screenshots made on the host OS would not match: do not commit them.
- Screenshots of removed or renamed stories fail the run; `vp run visual:update` deletes them.
- The report of the last run: `apps/storybook/playwright-report/index.html`.
