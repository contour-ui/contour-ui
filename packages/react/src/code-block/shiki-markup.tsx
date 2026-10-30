/**
 * Highlighted code in the shape of Shiki's output with its css-variables theme, for the tests
 * and the tests (not exported by the package): `pre.shiki > code > span.line > span`, every token
 * colored with a `--shiki-*` variable, lines separated by `\n`. The samples are Shiki's tokens of
 * real code; the notation classes are the ones `@shikijs/transformers` adds.
 */
import { Fragment } from 'react';
import type { ComponentProps, CSSProperties, ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

/** The `--shiki-*` variable a token is colored with: the foreground, or a token role. */
export type ShikiColor =
  | 'foreground'
  | 'constant'
  | 'string'
  | 'comment'
  | 'keyword'
  | 'parameter'
  | 'function'
  | 'string-expression'
  | 'punctuation'
  | 'link'
  | 'inserted'
  | 'deleted'
  | 'changed';

/** A token: its color, its text, and `'word'` for a highlighted word (`[!code word:…]`). */
export type ShikiToken = readonly [color: ShikiColor, text: string, word?: 'word'];

/** The tokens of one line; an empty line has none. */
export type ShikiLine = readonly ShikiToken[];

/** The class a line notation gives the line, and the one it gives the `pre`. */
const NOTATIONS: ReadonlyArray<readonly [line: string, pre: string]> = [
  ['highlighted', 'has-highlighted'],
  ['diff', 'has-diff'],
  ['focused', 'has-focused'],
];

/** No notation on any line. */
const NO_LINE_CLASSES: Readonly<Record<number, string>> = {};

/** The inline style Shiki puts on the `pre`. */
const PRE_STYLE: CSSProperties = {
  backgroundColor: 'var(--shiki-background)',
  color: 'var(--shiki-foreground)',
};

/** The CSS value of a token's color. */
export const shikiVariable = (color: ShikiColor): string =>
  color === 'foreground' ? 'var(--shiki-foreground)' : `var(--shiki-token-${color})`;

/** The source code of the lines, as Shiki's output reads in `textContent`. */
export const sourceOf = (lines: readonly ShikiLine[]): string =>
  lines.map((tokens) => tokens.map(([, text]) => text).join('')).join('\n');

export interface ShikiPreProps extends ComponentProps<'pre'> {
  readonly lines: readonly ShikiLine[];
  /** Classes of lines by index, as the notations add them, e.g. `{ 1: 'diff add' }`. */
  readonly lineClasses?: Readonly<Record<number, string>> | undefined;
}

/** A `pre` as Shiki renders the lines with its css-variables theme. */
export function ShikiPre({
  lines,
  lineClasses = NO_LINE_CLASSES,
  className,
  style,
  ...props
}: ShikiPreProps): ReactElement {
  const used = new Set(Object.values(lineClasses).flatMap((classes) => classes.split(' ')));
  const preClasses = NOTATIONS.filter(([line]) => used.has(line)).map(([, pre]) => pre);

  return (
    <pre
      {...props}
      className={cx('shiki shiki-themes css-variables', ...preClasses, className)}
      style={{ ...PRE_STYLE, ...style }}
    >
      <code>
        {lines.map((tokens, index) => (
          // A line has no identity but its position, and the list never changes.
          // oxlint-disable-next-line react/no-array-index-key
          <Fragment key={index}>
            {index > 0 && '\n'}
            <span className={cx('line', lineClasses[index])}>
              {tokens.map(([color, text, word], position) => (
                <span
                  // oxlint-disable-next-line react/no-array-index-key
                  key={position}
                  className={word === 'word' ? 'highlighted-word' : undefined}
                  style={{ color: shikiVariable(color) }}
                >
                  {text}
                </span>
              ))}
            </span>
          </Fragment>
        ))}
      </code>
    </pre>
  );
}

/** A component with an empty line. */
export const SAVE_BUTTON: readonly ShikiLine[] = [
  [
    ['keyword', 'import'],
    ['foreground', ' { Button } '],
    ['keyword', 'from'],
    ['foreground', ' '],
    ['string-expression', "'@contour-ui/react'"],
    ['foreground', ';'],
  ],
  [],
  [
    ['keyword', 'export'],
    ['foreground', ' '],
    ['keyword', 'function'],
    ['foreground', ' '],
    ['function', 'SaveButton'],
    ['foreground', '() {'],
  ],
  [
    ['foreground', '  '],
    ['keyword', 'return'],
    ['foreground', ' <'],
    ['constant', 'Button'],
    ['foreground', ' '],
    ['function', 'variant'],
    ['keyword', '='],
    ['string-expression', '"solid"'],
    ['foreground', '>Save</'],
    ['constant', 'Button'],
    ['foreground', '>;'],
  ],
  [['foreground', '}']],
];

/** CSS with token variables. */
export const PANEL: readonly ShikiLine[] = [
  [
    ['function', '.panel'],
    ['foreground', ' {'],
  ],
  [
    ['foreground', '  '],
    ['constant', 'padding'],
    ['keyword', ':'],
    ['foreground', ' '],
    ['function', 'var'],
    ['constant', '(--ct-space-panel-inset)'],
    ['foreground', ';'],
  ],
  [
    ['foreground', '  '],
    ['constant', 'background'],
    ['keyword', ':'],
    ['foreground', ' '],
    ['function', 'var'],
    ['constant', '(--ct-color-bg-surface)'],
    ['foreground', ';'],
  ],
  [['foreground', '}']],
];

/** The stylesheet imports of an app; the tests highlight the one of `@contour-ui/react`. */
export const STYLESHEETS: readonly ShikiLine[] = [
  "'@contour-ui/tokens/tokens.css'",
  "'@contour-ui/tokens/fonts.css'",
  "'@contour-ui/react/styles.css'",
  "'./app.css'",
].map((path): ShikiLine => [
  ['keyword', 'import'],
  ['foreground', ' '],
  ['string-expression', path],
  ['foreground', ';'],
]);

/** A changed declaration: line 1 removed, line 2 added. */
export const RADIUS_CHANGE: readonly ShikiLine[] = [
  [
    ['function', '.contour-button'],
    ['foreground', ' {'],
  ],
  [
    ['foreground', '  '],
    ['constant', 'border-radius'],
    ['keyword', ':'],
    ['foreground', ' '],
    ['function', 'var'],
    ['constant', '(--ct-radius-control)'],
    ['foreground', ';'],
  ],
  [
    ['foreground', '  '],
    ['constant', 'border-radius'],
    ['keyword', ':'],
    ['foreground', ' '],
    ['constant', '0'],
    ['foreground', ';'],
  ],
  [['foreground', '}']],
];

/** Rendering an app; line 2 is focused in the tests. */
export const RENDER_ROOT: readonly ShikiLine[] = [
  [
    ['keyword', 'const'],
    ['foreground', ' '],
    ['constant', 'root'],
    ['foreground', ' '],
    ['keyword', '='],
    ['foreground', ' '],
    ['constant', 'document'],
    ['function', '.querySelector'],
    ['foreground', '('],
    ['string-expression', "'#root'"],
    ['foreground', ');'],
  ],
  [
    ['keyword', 'if'],
    ['foreground', ' (root '],
    ['keyword', '!=='],
    ['foreground', ' '],
    ['constant', 'null'],
    ['foreground', ') {'],
  ],
  [
    ['foreground', '  '],
    ['function', 'createRoot'],
    ['foreground', '(root)'],
    ['function', '.render'],
    ['foreground', '(<'],
    ['constant', 'Button'],
    ['foreground', '>Hello</'],
    ['constant', 'Button'],
    ['foreground', '>);'],
  ],
  [['foreground', '}']],
];

/** `themeAttribute` highlighted wherever it occurs (`[!code word:themeAttribute]`). */
export const THEME_ATTRIBUTE: readonly ShikiLine[] = [
  [
    ['keyword', 'import'],
    ['foreground', ' { '],
    ['foreground', 'themeAttribute', 'word'],
    ['foreground', ' } '],
    ['keyword', 'from'],
    ['foreground', ' '],
    ['string-expression', "'@contour-ui/tokens'"],
    ['foreground', ';'],
  ],
  [],
  [
    ['constant', 'document'],
    ['function', '.'],
    ['constant', 'documentElement'],
    ['function', '.setAttribute'],
    ['foreground', '('],
    ['foreground', 'themeAttribute', 'word'],
    ['punctuation', ','],
    ['foreground', ' '],
    ['string-expression', "'light'"],
    ['foreground', ');'],
  ],
];

/** A component long enough for line numbers to help. */
export const THEME_SWITCH: readonly ShikiLine[] = [
  [
    ['keyword', 'export'],
    ['foreground', ' '],
    ['keyword', 'function'],
    ['foreground', ' '],
    ['function', 'ThemeSwitch'],
    ['foreground', '() {'],
  ],
  [
    ['foreground', '  '],
    ['keyword', 'const'],
    ['foreground', ' ['],
    ['constant', 'theme'],
    ['punctuation', ','],
    ['foreground', ' '],
    ['constant', 'setTheme'],
    ['foreground', '] '],
    ['keyword', '='],
    ['foreground', ' '],
    ['function', 'useState'],
    ['foreground', '<'],
    ['function', 'Theme'],
    ['foreground', '>(defaultTheme);'],
  ],
  [],
  [
    ['foreground', '  '],
    ['function', 'useEffect'],
    ['foreground', '(() '],
    ['keyword', '=>'],
    ['foreground', ' {'],
  ],
  [
    ['foreground', '    '],
    ['constant', 'document'],
    ['function', '.'],
    ['constant', 'documentElement'],
    ['function', '.setAttribute'],
    ['foreground', '(themeAttribute'],
    ['punctuation', ','],
    ['foreground', ' theme);'],
  ],
  [
    ['foreground', '  }'],
    ['punctuation', ','],
    ['foreground', ' [theme]);'],
  ],
  [['foreground', '}']],
];

/** One line longer than any column: it scrolls. */
export const TRANSITION: readonly ShikiLine[] = [
  [
    ['keyword', 'export'],
    ['foreground', ' '],
    ['keyword', 'const'],
    ['foreground', ' '],
    ['constant', 'transition'],
    ['foreground', ' '],
    ['keyword', '='],
    ['foreground', ' '],
    [
      'string-expression',
      "'background-color var(--ct-motion-feedback), border-color var(--ct-motion-feedback), color var(--ct-motion-feedback)'",
    ],
    ['foreground', ';'],
  ],
];
