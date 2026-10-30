import { Fragment } from 'react';
import type { ComponentProps, CSSProperties, ElementType, JSX, ReactElement } from 'react';

import { getMdxComponents } from '../mdx/index.ts';

/** The MDX components of a page, as an app gets them. */
const components = getMdxComponents();

/**
 * The component MDX renders for the element `tag` (`## Usage` is an `h2`): the one of
 * `getMdxComponents()`, or the element itself where the map has none, as for `p`.
 */
export function mdx<T extends keyof JSX.IntrinsicElements>(tag: T): ElementType<ComponentProps<T>> {
  // MDX gives the component of an element the props of that element; the type of the map allows
  // any element in its place, which a test never renders.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (components[tag] ?? tag) as ElementType<ComponentProps<T>>;
}

/** The `--shiki-*` variable that colors a token, from Shiki's css-variables theme. */
type ShikiColor =
  | 'foreground'
  | 'token-comment'
  | 'token-constant'
  | 'token-function'
  | 'token-keyword'
  | 'token-parameter'
  | 'token-punctuation'
  | 'token-string'
  | 'token-string-expression';

/** A token of highlighted code: its text, and its color. */
export type CodeToken = readonly [text: string, color: ShikiColor];

/** A line of highlighted code. */
export type CodeLine = readonly CodeToken[];

/** The props `rehypeCode` gives the `pre` of a code block with Shiki's css-variables theme. */
const SHIKI_PRE = {
  className: 'shiki shiki-themes css-variables',
  style: {
    backgroundColor: 'var(--shiki-background)',
    color: 'var(--shiki-foreground)',
  } satisfies CSSProperties,
} as const;

/** The highlighted lines as Shiki renders them: a `span.line` each, joined by line breaks. */
function HighlightedLines({ lines }: { readonly lines: readonly CodeLine[] }): ReactElement {
  return (
    <code>
      {lines.map((line, index) => (
        // Lines have no identity but their place, and the code never changes.
        // oxlint-disable-next-line react/no-array-index-key
        <Fragment key={index}>
          {index === 0 ? null : '\n'}
          <span className="line">
            {line.map(([text, color], column) => (
              // oxlint-disable-next-line react/no-array-index-key
              <span key={column} style={{ color: `var(--shiki-${color})` }}>
                {text}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </code>
  );
}

export interface CodeExampleProps {
  readonly lines: readonly CodeLine[];
  /** `title="…"` of the code block's meta. */
  readonly title?: string | undefined;
  /** `noCopy` of the meta. */
  readonly noCopy?: boolean | undefined;
  /** `lineNumbers` (`true`) or `lineNumbers=N` (the first number) of the meta. */
  readonly lineNumbers?: boolean | number | undefined;
}

const Pre = mdx('pre');

/**
 * A fenced code block of an MDX page, as the MDX `pre` gets it from Fumadocs' `rehypeCode`
 * with the docs site's options (Shiki's css-variables theme, no tab index, no icon).
 */
export function CodeExample({ lines, title, noCopy, lineNumbers }: CodeExampleProps): ReactElement {
  const meta = {
    title,
    allowCopy: noCopy === true ? 'false' : undefined,
    'data-line-numbers': lineNumbers === undefined || lineNumbers === false ? undefined : true,
    'data-line-numbers-start': typeof lineNumbers === 'number' ? lineNumbers : undefined,
  };
  return (
    <Pre {...SHIKI_PRE} {...meta}>
      <HighlightedLines lines={lines} />
    </Pre>
  );
}

/** `import { Button } from '@contour-ui/react';` and a button, as on the page of Button. */
export const BUTTON_CODE: readonly CodeLine[] = [
  [
    ['import', 'token-keyword'],
    [' { Button } ', 'foreground'],
    ['from', 'token-keyword'],
    [" '@contour-ui/react'", 'token-string-expression'],
    [';', 'foreground'],
  ],
  [],
  [
    ['<', 'foreground'],
    ['Button', 'token-constant'],
    [' onClick', 'token-function'],
    ['=', 'token-keyword'],
    ['{save}>Save</', 'foreground'],
    ['Button', 'token-constant'],
    ['>;', 'foreground'],
  ],
];

/** A shell command. */
export const INSTALL_CODE: readonly CodeLine[] = [
  [
    ['pnpm', 'token-function'],
    [' add', 'token-string'],
    [' @contour-ui/react', 'token-string'],
    [' @contour-ui/tokens', 'token-string'],
  ],
];

/** CSS with a comment, long enough to scroll sideways on a phone. */
export const CSS_CODE: readonly CodeLine[] = [
  [['/* A panel that stands out from the page, in every theme. */', 'token-comment']],
  [
    ['.panel', 'token-function'],
    [' {', 'foreground'],
  ],
  [
    ['  background', 'token-parameter'],
    [':', 'foreground'],
    [' var(--ct-color-bg-surface)', 'token-constant'],
    [';', 'foreground'],
  ],
  [
    ['  border', 'token-parameter'],
    [':', 'foreground'],
    [' var(--ct-border-width-default) solid var(--ct-color-border-default)', 'token-constant'],
    [';', 'foreground'],
  ],
  [['}', 'foreground']],
];
