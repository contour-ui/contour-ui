/**
 * One build: the sources become the model, the checks run over it, the outputs write the files.
 * Every problem is collected; a build with problems ships nothing.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { CheckContext, TokenCheck } from './checks/check.ts';
import type { TokenModel } from './model/model.ts';
import { attemptBuild } from './model/problem.ts';
import type { Problem, Report } from './model/problem.ts';
import type { Artifact, TokenOutput } from './outputs/output.ts';
import { resolveModel } from './resolve/resolve.ts';

export interface DesignTokensOptions {
  /** The DTCG resolver file, relative to the package. */
  readonly resolver: string;
  /** Everything the package ships. */
  readonly outputs: readonly TokenOutput[];
  /** Rules beyond the built-in ones. */
  readonly checks?: readonly TokenCheck[];
}

export interface TokenBuild {
  /** `undefined` when the sources do not make a model. */
  readonly model: TokenModel | undefined;
  readonly artifacts: readonly Artifact[];
  readonly problems: readonly Problem[];
  /** Every file the build read, to watch. */
  readonly files: readonly string[];
}

/** The name of an artifact in `dist`. */
const fileOf = (artifact: Artifact): string =>
  artifact.kind === 'entry' ? `${artifact.name}.js` : artifact.fileName;

export async function buildTokens(
  options: DesignTokensOptions,
  /** The package directory, which the options' paths are relative to. */
  cwd: string = process.cwd(),
): Promise<TokenBuild> {
  const problems: Problem[] = [];
  const report: Report = (problem) => {
    problems.push(problem);
  };
  const files = new Set<string>();
  const context: CheckContext = {
    readJson(file) {
      const absolute = path.resolve(cwd, file);
      files.add(absolute);
      const data: unknown = JSON.parse(readFileSync(absolute, 'utf8'));
      return data;
    },
  };

  const model = await resolveModel(path.resolve(cwd, options.resolver), context, report);
  if (model === undefined || problems.length > 0) {
    return { model, artifacts: [], problems, files: [...files] };
  }
  for (const check of options.checks ?? []) {
    attemptBuild(report, check.name, () => {
      check.run(model, report, context);
    });
  }
  const artifacts: Artifact[] = [];
  /** The output that wrote each file. */
  const writers = new Map<string, string>();
  for (const output of options.outputs) {
    for (const artifact of output.build(model, report)) {
      const file = fileOf(artifact);
      const writer = writers.get(file);
      if (writer !== undefined) {
        report({ source: output.name, message: `${file} is also written by ${writer}.` });
      }
      writers.set(file, output.name);
      artifacts.push(artifact);
    }
  }
  return { model, artifacts: problems.length > 0 ? [] : artifacts, problems, files: [...files] };
}
