/**
 * The tsdown plugin of `vp pack`: the package's entries are modules this plugin generates and its
 * assets files it emits, all built from the DTCG sources on every build, `--watch` included.
 *
 * - `tsdownConfig` adds the entries, known from the outputs before any build.
 * - `buildStart` builds the tokens, watches every file the build read and fails the build with
 *   the list of problems.
 * - `resolveId` and `load` serve the entries as TypeScript; tsdown bundles them and writes their
 *   declarations (Oxc, from the code, under `isolatedDeclarations`).
 * - `generateBundle` emits the assets.
 */
import type { TsdownPlugin } from 'vite-plus/pack';

import { buildTokens } from './build.ts';
import type { DesignTokensOptions, TokenBuild } from './build.ts';
import { formatProblems } from './model/problem.ts';

/**
 * The id prefix of the generated entries: `\0` keeps other plugins off a module that is no file,
 * and the `.ts` ending makes it TypeScript to tsdown and to its declarations plugin.
 */
const VIRTUAL = '\0design-tokens:';

const moduleId = (entry: string): string => `${VIRTUAL}${entry}.ts`;

export function designTokens(options: DesignTokensOptions): TsdownPlugin {
  const entries = options.outputs.flatMap((output) => output.entries);
  const repeated = entries.filter((entry, index) => entries.indexOf(entry) !== index);
  if (repeated.length > 0) {
    throw new Error(`designTokens: entries added twice: ${repeated.join(', ')}.`);
  }
  let cwd = process.cwd();
  let build: TokenBuild | undefined;

  return {
    name: 'design-tokens',

    tsdownConfig(config) {
      cwd = config.cwd ?? cwd;
      return { entry: Object.fromEntries(entries.map((entry) => [entry, moduleId(entry)])) };
    },

    buildStart: {
      order: 'pre',
      async handler() {
        build = await buildTokens(options, cwd);
        for (const file of build.files) {
          this.addWatchFile(file);
        }
        if (build.problems.length > 0) {
          this.error(formatProblems(build.problems));
        }
      },
    },

    resolveId(source) {
      return source.startsWith(VIRTUAL) ? source : undefined;
    },

    load(id) {
      if (!id.startsWith(VIRTUAL)) {
        return undefined;
      }
      const artifact = build?.artifacts.find(
        (candidate) => candidate.kind === 'entry' && moduleId(candidate.name) === id,
      );
      if (artifact?.kind !== 'entry') {
        return this.error(`designTokens: no output wrote ${id.slice(1)}.`);
      }
      return { code: artifact.code, moduleType: 'ts' };
    },

    generateBundle() {
      for (const artifact of build?.artifacts ?? []) {
        if (artifact.kind === 'asset') {
          this.emitFile({ type: 'asset', fileName: artifact.fileName, source: artifact.source });
        }
      }
    },
  };
}
