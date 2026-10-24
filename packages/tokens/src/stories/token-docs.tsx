/**
 * Building blocks of the token docs stories. Rows come from
 * `src/generated/docs.json` (the Style Dictionary build), so the tables list
 * exactly what `tokens.css` declares, with each theme's resolved value and alias.
 */
import { Fragment, useEffect, useState } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

import docs from '../generated/docs.json' with { type: 'json' };
import { themes } from '../index.ts';
import type { Theme } from '../index.ts';

import './token-docs.css';

/** One custom property of `tokens.css`. */
export type TokenDoc = (typeof docs.tokens)[number];

/** Custom properties of the tokens under a DTCG path prefix, e.g. `color.` or `base.font-weight.`. */
export function tokensIn(prefix: string): TokenDoc[] {
  return docs.tokens.filter((doc) => doc.token.startsWith(prefix));
}

/** The custom property of one composite sub-value, e.g. `text.label` + `fontSize`. */
export function partOf(token: string, part: string): TokenDoc | undefined {
  return docs.tokens.find((doc) => doc.token === token && doc.part === part);
}

/** Token name with a copy button. */
function TokenName({ name }: { readonly name: string }): ReactElement {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setCopied(false);
    }, 1500);
    return () => {
      clearTimeout(timer);
    };
  }, [copied]);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(name);
      setCopied(true);
    } catch (error) {
      // A cross-origin frame (the dev composition host) may have no clipboard access.
      console.warn(`Could not copy ${name}.`, error);
    }
  };

  return (
    <span className="token-name">
      <code>{name}</code>
      <button
        type="button"
        className="token-copy"
        aria-label={`${copied ? 'Copied' : 'Copy'} ${name}`}
        onClick={() => {
          void copy();
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  );
}

/** Resolved value with the custom property it aliases underneath. */
export function ThemeValue({
  doc,
  theme,
}: {
  readonly doc: TokenDoc;
  readonly theme: Theme;
}): ReactElement {
  const { value, alias } = doc.themes[theme];
  return (
    <span className="token-value">
      <code>{value}</code>
      {alias !== null && <code className="token-muted">{alias}</code>}
    </span>
  );
}

/** Value of a theme-independent token; lists every theme if they ever differ. */
export function Value({ doc }: { readonly doc: TokenDoc }): ReactElement {
  const [first, ...rest] = themes;
  const same = rest.every(
    (theme) =>
      doc.themes[theme].value === doc.themes[first].value &&
      doc.themes[theme].alias === doc.themes[first].alias,
  );
  if (same) {
    return <ThemeValue doc={doc} theme={first} />;
  }
  return (
    <span className="token-value">
      {themes.map((theme) => (
        <span key={theme} className="token-row">
          <span className="token-muted">{theme}</span>
          <ThemeValue doc={doc} theme={theme} />
        </span>
      ))}
    </span>
  );
}

/** Sub-values of a composite token (`[part, label]` pairs), each with its value and alias. */
export function Parts({
  doc,
  parts,
}: {
  readonly doc: TokenDoc;
  readonly parts: ReadonlyArray<readonly [part: string, label: string]>;
}): ReactElement {
  return (
    <dl className="token-parts">
      {parts.map(([part, label]) => {
        const property = partOf(doc.token, part);
        return (
          property !== undefined && (
            <Fragment key={part}>
              <dt>{label}</dt>
              <dd>
                <Value doc={property} />
              </dd>
            </Fragment>
          )
        );
      })}
    </dl>
  );
}

/** Color swatch drawn in `theme`, on that theme's canvas. */
export function ColorChip({
  name,
  theme,
}: {
  readonly name: string;
  readonly theme: Theme;
}): ReactElement {
  return (
    <span className="token-chip" data-theme={theme} aria-hidden="true">
      <span className="token-swatch" style={{ background: `var(${name})` }} />
    </span>
  );
}

/** Sample element styled by the token, e.g. `{ inlineSize: 'var(--ct-space-group-gap)' }`. */
export function Sample({
  className,
  style,
}: {
  readonly className: string;
  readonly style: CSSProperties;
}): ReactElement {
  return <span className={className} style={style} aria-hidden="true" />;
}

/** The curve of the `cubic-bezier()` in a resolved transition or easing value. */
export function EasingCurve({ value }: { readonly value: string }): ReactElement {
  const points = /cubic-bezier\(([^)]*)\)/u.exec(value)?.[1]?.split(',').map(Number);
  const [x1, y1, x2, y2] = points ?? [];
  if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
    return <span className="token-muted">—</span>;
  }
  return (
    <svg className="token-curve" viewBox="-0.1 -0.1 1.2 1.2" aria-hidden="true">
      <path d={`M0 1C${x1} ${1 - y1} ${x2} ${1 - y2} 1 0`} />
    </svg>
  );
}

export interface Column {
  readonly title: string;
  readonly render: (doc: TokenDoc) => ReactNode;
}

/** Group custom properties by a key, keeping their order. */
export function groupTokens(
  rows: readonly TokenDoc[],
  keyOf: (doc: TokenDoc) => string,
): Map<string, TokenDoc[]> {
  const groups = new Map<string, TokenDoc[]>();
  for (const doc of rows) {
    const key = keyOf(doc);
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [doc]);
    } else {
      group.push(doc);
    }
  }
  return groups;
}

/**
 * Token table on a surface panel: the custom property (with copy) and its
 * description first, then `columns`.
 */
export function TokenTable({
  caption,
  rows,
  columns,
}: {
  readonly caption: string;
  readonly rows: readonly TokenDoc[];
  readonly columns: readonly Column[];
}): ReactElement {
  return (
    <div className="token-panel">
      <table className="token-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Token</th>
            {columns.map(({ title }) => (
              <th key={title} scope="col">
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((doc) => (
            <tr key={doc.name}>
              <th scope="row">
                <TokenName name={doc.name} />
                {doc.description !== null && (
                  <span className="token-description">{doc.description}</span>
                )}
              </th>
              {columns.map(({ title, render }) => (
                <td key={title}>{render(doc)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Base palette: one row per hue, one column per stop; hover a swatch for its name and value. */
export function PaletteTable({
  caption,
  rows,
}: {
  readonly caption: string;
  readonly rows: readonly TokenDoc[];
}): ReactElement {
  const [theme] = themes;
  // `base.color.<hue>.<stop>`
  const stopOf = (doc: TokenDoc): string => doc.token.split('.')[3] ?? '';
  const hueOf = (doc: TokenDoc): string => doc.token.split('.')[2] ?? '';
  const stops = [...new Set(rows.map((doc) => stopOf(doc)))].toSorted(
    (a, b) => Number(a) - Number(b),
  );
  const hues = [...new Set(rows.map((doc) => hueOf(doc)))];
  return (
    <div className="token-panel">
      <table className="token-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Hue</th>
            {stops.map((stop) => (
              <th key={stop} scope="col">
                {stop}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hues.map((hue) => (
            <tr key={hue}>
              <th scope="row">{hue}</th>
              {stops.map((stop) => {
                const doc = rows.find((row) => hueOf(row) === hue && stopOf(row) === stop);
                return (
                  <td key={stop}>
                    {doc !== undefined && (
                      <span
                        className="token-swatch"
                        style={{ background: `var(${doc.name})` }}
                        title={`${doc.name}: ${doc.themes[theme].value}`}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
