/**
 * The `values` entry: the values of the tokens for a platform without CSS, one object per theme,
 * with the interface of one theme's values. The platform decides what each value is and which
 * tokens it leaves out.
 */
import { themesDefaultFirst } from '../model/model.ts';
import type { ModelToken } from '../model/model.ts';
import { attempt } from '../model/problem.ts';
import type { PlainValue, ValuesPlatform } from '../platforms/values.ts';
import { docComment, generatedBy, propertyName } from './output.ts';
import type { TierOption, TokenOutput } from './output.ts';

interface Node {
  readonly children: Map<string, Node>;
  token?: ModelToken;
  type?: string;
  value?: PlainValue;
}

const newNode = (): Node => ({ children: new Map() });

/** A value as a TypeScript literal: strings single-quoted, objects on one line. */
function literal(value: PlainValue): string {
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return `'${value.replaceAll('\\', '\\\\').replaceAll("'", String.raw`\'`)}'`;
  }
  const entries = Object.entries(value).map(
    ([key, item]) => `${propertyName(key)}: ${literal(item)}`,
  );
  return `{ ${entries.join(', ')} }`;
}

function renderType(node: Node, depth: number, lines: string[]): void {
  const pad = '  '.repeat(depth);
  for (const [key, child] of node.children) {
    if (child.token?.description !== undefined) {
      lines.push(docComment(pad, child.token.description));
    }
    if (child.type === undefined) {
      lines.push(`${pad}readonly ${propertyName(key)}: {`);
      renderType(child, depth + 1, lines);
      lines.push(`${pad}};`);
    } else {
      lines.push(`${pad}readonly ${propertyName(key)}: ${child.type};`);
    }
  }
}

function renderValues(node: Node, depth: number, lines: string[]): void {
  const pad = '  '.repeat(depth);
  for (const [key, child] of node.children) {
    if (child.value === undefined) {
      lines.push(`${pad}${propertyName(key)}: {`);
      renderValues(child, depth + 1, lines);
      lines.push(`${pad}},`);
    } else {
      lines.push(`${pad}${propertyName(key)}: ${literal(child.value)},`);
    }
  }
}

function nodeAt(root: Node, keys: readonly string[]): Node {
  let node = root;
  for (const key of keys) {
    let child = node.children.get(key);
    if (child === undefined) {
      child = newNode();
      node.children.set(key, child);
    }
    node = child;
  }
  return node;
}

const capitalize = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

export function values(
  platform: ValuesPlatform,
  {
    entry,
    name,
    tiers = ['semantic', 'component'],
  }: {
    readonly entry: string;
    /** The exported object of every theme's values; its interface takes the name capitalized. */
    readonly name: string;
  } & TierOption,
): TokenOutput {
  const source = `values(${entry})`;
  return {
    name: source,
    entries: [entry],
    build(model, report) {
      // The tokens of the tiers that the platform has a value for, with the type of it.
      const typed = model.tokens.flatMap((token) => {
        const type = platform.type(token);
        return tiers.includes(token.tier) && type !== undefined ? [{ token, type }] : [];
      });
      const themes = themesDefaultFirst(model);
      const trees = new Map<string, Node>();
      let failed = false;
      for (const theme of themes) {
        const root = newNode();
        for (const { token, type } of typed) {
          const value = attempt(report, `${source}: ${platform.name}`, token, theme, () =>
            platform.value(token, theme),
          );
          if (value === undefined) {
            failed = true;
            continue;
          }
          const node = nodeAt(root, token.path);
          node.token = token;
          node.type = type;
          node.value = value;
        }
        trees.set(theme, root);
      }
      const defaults = trees.get(model.defaultTheme);
      if (failed || defaults === undefined) {
        return [];
      }
      const typeName = capitalize(name);
      const lines = [
        `// ${generatedBy(model)}`,
        '',
        ...platform.declarations,
        '',
        '/**',
        ...platform.description.map((line) => ` * ${line}`),
        ' */',
        `export interface ${typeName} {`,
      ];
      renderType(defaults, 1, lines);
      const themeUnion = model.themes.map((theme) => `'${theme}'`).join(' | ');
      lines.push(
        '}',
        '',
        '/** The values of every token in each theme. */',
        `export const ${name}: Readonly<Record<${themeUnion}, ${typeName}>> = {`,
      );
      for (const theme of themes) {
        lines.push(`  ${propertyName(theme)}: {`);
        renderValues(trees.get(theme) ?? newNode(), 2, lines);
        lines.push('  },');
      }
      lines.push('};', '');
      return [{ kind: 'entry', name: entry, code: lines.join('\n') }];
    },
  };
}
