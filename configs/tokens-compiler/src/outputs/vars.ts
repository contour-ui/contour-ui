/**
 * The `vars` entry: typed `var(--…)` references to the tokens, which follow the active theme
 * through CSS, and the themes with their attribute.
 */
import path from 'node:path';

import { themeDeclarations } from '../platforms/web.ts';
import type { WebPlatform } from '../platforms/web.ts';
import { docComment, generatedBy, propertyName } from './output.ts';
import type { TierOption, TokenOutput } from './output.ts';

interface VarNode {
  readonly children: Map<string, VarNode>;
  value?: string;
  description?: string;
}

const newNode = (): VarNode => ({ children: new Map() });

function nodeAt(root: VarNode, keys: readonly string[]): VarNode {
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

function renderVars(node: VarNode, depth: number): string[] {
  const pad = '  '.repeat(depth);
  const lines: string[] = [];
  for (const [key, child] of node.children) {
    if (child.description !== undefined) {
      lines.push(docComment(pad, child.description));
    }
    if (child.value === undefined) {
      lines.push(`${pad}${propertyName(key)}: {`, ...renderVars(child, depth + 1), `${pad}},`);
    } else {
      lines.push(`${pad}${propertyName(key)}: '${child.value}',`);
    }
  }
  return lines;
}

export function vars(
  web: WebPlatform,
  { entry, tiers = ['semantic', 'component'] }: { readonly entry: string } & TierOption,
): TokenOutput {
  const source = `vars(${entry})`;
  return {
    name: source,
    entries: [entry],
    build(model, report) {
      const tokens = model.tokens.filter((token) => tiers.includes(token.tier));
      const [defaults] = themeDeclarations(model, web, tokens, source, report) ?? [];
      if (defaults === undefined) {
        return [];
      }
      const root = newNode();
      for (const token of tokens) {
        const node = nodeAt(root, token.path);
        if (token.description !== undefined) {
          node.description = token.description;
        }
        for (const { name, part } of defaults.declarations.get(token.id) ?? []) {
          nodeAt(node, part).value = `var(${name})`;
        }
      }
      const themes = model.themes.map((theme) => `'${theme}'`).join(', ');
      const attribute = web.themeAttribute;
      const code = [
        `// ${generatedBy(model)}`,
        '',
        '/**',
        ` * \`var(--${web.prefix}-…)\` references for every semantic token. Values follow the active`,
        ' * theme through CSS; base tokens are internal and not exported.',
        ' */',
        'export const vars = {',
        ...renderVars(root, 1),
        '} as const;',
        '',
        `/** Theme contexts from ${path.basename(model.resolver)}. */`,
        `export const themes = [${themes}] as const;`,
        '',
        'export type Theme = (typeof themes)[number];',
        '',
        `export const defaultTheme: Theme = '${model.defaultTheme}';`,
        '',
        `/** Attribute that switches the theme of any subtree, e.g. \`${attribute}="${model.defaultTheme}"\`. */`,
        `export const themeAttribute = '${attribute}';`,
        '',
      ].join('\n');
      return [{ kind: 'entry', name: entry, code }];
    },
  };
}
