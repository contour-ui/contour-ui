/**
 * What a build finds wrong. Every layer reports problems instead of throwing, so one build lists
 * all of them, each with the token and the theme to fix.
 */
import type { ModelToken } from './model.ts';

export interface Problem {
  /** The check, output or platform that found it. */
  readonly source: string;
  /** The token's id. */
  readonly token?: string | undefined;
  readonly theme?: string | undefined;
  readonly message: string;
}

export type Report = (problem: Problem) => void;

export const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Run `work` for one token; a thrown error becomes a problem of that token. */
export function attempt<T>(
  report: Report,
  source: string,
  token: ModelToken,
  theme: string | undefined,
  work: () => T,
): T | undefined {
  try {
    return work();
  } catch (error) {
    report({ source, token: token.id, theme, message: messageOf(error) });
    return undefined;
  }
}

/** Run `work`; a thrown error becomes a problem of the build. */
export function attemptBuild<T>(report: Report, source: string, work: () => T): T | undefined {
  try {
    return work();
  } catch (error) {
    report({ source, message: messageOf(error) });
    return undefined;
  }
}

/** One message for every problem, as the build fails with it. */
export function formatProblems(problems: readonly Problem[]): string {
  const lines = problems.map(({ source, token, theme, message }) => {
    const where = [token, theme === undefined ? undefined : `(${theme})`]
      .filter((part) => part !== undefined)
      .join(' ');
    return `  ${source}: ${where === '' ? '' : `${where}: `}${message}`;
  });
  const count = problems.length === 1 ? '1 problem' : `${problems.length} problems`;
  return `design tokens: ${count}\n${lines.join('\n')}`;
}
