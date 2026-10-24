/**
 * Commit message check, run by the `commit-msg` hook (.vite-hooks/commit-msg):
 * Conventional Commits (https://www.conventionalcommits.org/en/v1.0.0/).
 *
 *   type(scope)!: subject
 *
 *   Optional body, separated from the header by a blank line.
 *
 * - `type` is one of TYPES; `scope` is lowercase kebab-case (a package name
 *   such as `kit`, or `config`, `repo`…); `!` marks a breaking change.
 * - The subject is imperative, starts lowercase and has no trailing period;
 *   the whole header fits in MAX_HEADER characters.
 * - Merge, revert, fixup and squash messages written by git are not checked.
 *
 * Usage: `node scripts/check-commit-msg.ts <message file>`.
 */
import { readFileSync } from 'node:fs';

const TYPES = [
  'feat',
  'fix',
  'docs',
  'test',
  'refactor',
  'perf',
  'style',
  'build',
  'ci',
  'chore',
  'revert',
] as const;

const MAX_HEADER = 72;

const HEADER = new RegExp(
  String.raw`^(?:${TYPES.join('|')})(?:\([a-z0-9-]+\))?!?: (?<subject>.+)$`,
  'u',
);

// Messages git generates itself.
const GENERATED = /^(?:Merge |Revert "|(?:fixup|squash|amend)! )/u;

// `git commit --verbose` appends the diff below this line.
const SCISSORS = '# ------------------------ >8 ------------------------';

const [file] = process.argv.slice(2);
if (file === undefined) {
  console.error('Usage: node scripts/check-commit-msg.ts <message file>');
  process.exit(2);
}

const lines: string[] = [];
for (const line of readFileSync(file, 'utf8').split('\n')) {
  if (line === SCISSORS) {
    break;
  }
  if (!line.startsWith('#')) {
    lines.push(line);
  }
}
const message = lines.join('\n').trim();
const [header = '', second] = message.split('\n');

const errors: string[] = [];

if (!GENERATED.test(header)) {
  const subject = HEADER.exec(header)?.groups?.['subject'];
  if (subject === undefined) {
    errors.push(`The header must read "type(scope): subject", type one of: ${TYPES.join(', ')}.`);
  } else {
    if (/^\p{Lu}/u.test(subject)) {
      errors.push('The subject must start with a lowercase letter.');
    }
    if (subject.endsWith('.')) {
      errors.push('The subject must not end with a period.');
    }
  }
  if (header.length > MAX_HEADER) {
    errors.push(`The header is ${header.length} characters long; the limit is ${MAX_HEADER}.`);
  }
  if (second !== undefined && second.trim() !== '') {
    errors.push('Separate the body from the header with a blank line.');
  }
}

if (errors.length > 0) {
  console.error(`✖ Commit message rejected:\n\n  ${header}\n`);
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  console.error('\nSee AGENTS.md ("Git").');
  process.exitCode = 1;
}
