/**
 * A check is a rule of the design over the model. A violation is a problem of the build, which
 * fails with the list of them: the build is the test.
 */
import type { TokenModel } from '../model/model.ts';
import type { Report } from '../model/problem.ts';

export interface CheckContext {
  /** Read a JSON file relative to the package; the build watches it. */
  readJson(file: string): unknown;
}

export interface TokenCheck {
  readonly name: string;
  run(model: TokenModel, report: Report, context: CheckContext): void;
}
