import { describe, expect, it } from 'vite-plus/test';

import { exportName } from '../scripts/build-icons.ts';
import { LUCIDE_ICONS, SIMPLE_ICONS } from '../scripts/icon-list.ts';
import * as api from './index.ts';
import { PathCommand, githubIcon, searchIcon } from './index.ts';
import type { IconData } from './index.ts';

const icons = Object.entries(api).flatMap(([name, value]): Array<[string, IconData]> =>
  typeof value === 'object' && 'paths' in value ? [[name, value]] : [],
);

/** Absolute `M`, `L`, `C`, `Q`, `Z` commands with their numbers, nothing else. */
const NORMALIZED = /^(?:[CLMQZ][\d .-]*)+$/u;

/** Number of arguments after each opcode. */
const ARITY = new Map<number, number>([
  [PathCommand.M, 2],
  [PathCommand.L, 2],
  [PathCommand.C, 6],
  [PathCommand.Q, 4],
  [PathCommand.Z, 0],
]);

/** Opcodes of `commands`, walking over the arguments; fails on an unknown or cut-short command. */
function opcodes(commands: readonly number[]): number[] {
  const result: number[] = [];
  let index = 0;
  while (index < commands.length) {
    const opcode = commands[index] ?? -1;
    const arity = ARITY.get(opcode);
    if (arity === undefined || index + arity >= commands.length) {
      throw new Error(`malformed command ${opcode} at ${index}`);
    }
    result.push(opcode);
    index += arity + 1;
  }
  return result;
}

const OPCODES = new Map<string, number>(Object.entries(PathCommand));

/** `commands` as read from `d`: each letter as its opcode, each number as is. */
function commandsOf(d: string): number[] {
  return (d.match(/[A-Z]|[^\sA-Z]+/gu) ?? []).map((token) => OPCODES.get(token) ?? Number(token));
}

describe('icon exports', () => {
  it('exports every icon of scripts/icon-list.ts as <camelName>Icon', () => {
    const expected = [...LUCIDE_ICONS, ...SIMPLE_ICONS].map((name) => exportName(name));
    expect(icons.map(([name]) => name).toSorted()).toStrictEqual(expected.toSorted());
  });

  it.each(icons)('%s: paths use only absolute M, L, C, Q and Z', (_name, icon) => {
    expect(icon.size).toBe(24);
    expect(icon.paths.length).toBeGreaterThan(0);
    for (const path of icon.paths) {
      expect(path.d).toMatch(NORMALIZED);
      expect(opcodes(path.commands)[0]).toBe(PathCommand.M);
    }
  });

  it.each(icons)('%s: commands are the numbers of d', (_name, icon) => {
    for (const path of icon.paths) {
      expect(path.commands).toStrictEqual(commandsOf(path.d));
    }
  });
});

describe('converted icons', () => {
  it('search: a stroked line and a circle of four cubic curves', () => {
    const { M, L, C, Z } = PathCommand;
    expect(searchIcon.strokeWidth).toBe(2);
    expect(searchIcon.paths[0]).toStrictEqual({
      d: 'M21 21L16.66 16.66',
      commands: [M, 21, 21, L, 16.66, 16.66],
      fill: false,
    });
    expect(searchIcon.paths.map((path) => opcodes(path.commands))).toStrictEqual([
      [M, L],
      [M, C, C, C, C, Z],
    ]);
    expect(searchIcon.paths.map((path) => path.fill)).toStrictEqual([false, false]);
  });

  it('github: a filled logo without a stroke', () => {
    expect(githubIcon.strokeWidth).toBe(0);
    expect(githubIcon.paths.map((path) => path.fill)).toStrictEqual([true]);
  });
});
