import type { Theme } from '@contour-ui/tokens';
import type { ReactElement } from 'react';

import { contrastLevel, formatRatio } from './contrast.ts';
import { capitalize, groupBy, textContrastOf, tokenAt, tokensIn } from './token-data.ts';
import type { TokenDoc } from './token-data.ts';
import { ThemePanels, ThemeValue, TokenDescription, TokenName } from './token-parts.tsx';

const SYNTAX = 'color.syntax.';

/** `color.<group>.<role>`: the groups whose names are abbreviations. */
const GROUP_TITLES: Readonly<Record<string, string>> = { bg: 'Background', fg: 'Foreground' };

/** The role of a color custom property as its name reads it: `--ct-color-bg-surface` → `bg-surface`. */
const roleName = (doc: TokenDoc): string => doc.name.replace(/^--ct-color-/u, '');

/** A swatch of the color, over two tones that show through a translucent color (the scrim). */
function Swatch({ name }: { readonly name: string }): ReactElement {
  return (
    <span className="docs-token-swatch" aria-hidden="true">
      <span style={{ backgroundColor: `var(${name})` }} />
    </span>
  );
}

/**
 * The contrast of a text role in `theme` on each background it is meant for, as the token build
 * measures it, with the target it holds the role to.
 */
function Contrast({
  doc,
  theme,
}: {
  readonly doc: TokenDoc;
  readonly theme: Theme;
}): ReactElement | null {
  const pairs = textContrastOf(doc.token);
  if (pairs.length === 0) {
    return null;
  }
  const targets = [...new Set(pairs.map(({ minimum }) => minimum))];
  const [target] = targets;
  return (
    <div className="docs-token-contrast">
      <p className="docs-token-contrast__target">
        {target === null || target === undefined
          ? 'Contrast, no target: disabled text'
          : `Contrast, target ${targets.join(':1, ')}:1`}
      </p>
      <ul className="docs-token-contrast__pairs">
        {pairs.map((pair) => {
          const background = tokenAt(pair.background);
          const ratio = pair.ratios[theme];
          return (
            <li key={pair.background}>
              <code>{formatRatio(ratio)}</code> on{' '}
              {background === undefined ? pair.background : roleName(background)} ·{' '}
              {contrastLevel(ratio)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ColorRole({
  doc,
  theme,
}: {
  readonly doc: TokenDoc;
  readonly theme: Theme;
}): ReactElement {
  return (
    <li className="docs-token-role">
      <TokenName name={doc.name} />
      <div className="docs-token-role__body">
        <Swatch name={doc.name} />
        <div className="docs-token-role__details">
          <ThemeValue doc={doc} theme={theme} />
          <TokenDescription doc={doc} />
          <Contrast doc={doc} theme={theme} />
        </div>
      </div>
    </li>
  );
}

/**
 * The color roles, grouped as the tokens are (`bg`, `fg`, `border`, the status colors…), each
 * group in a panel per theme. Text roles show their contrast; the syntax colors have a section of
 * their own ({@link SyntaxColors}).
 */
export function ColorRoles(): ReactElement {
  const groups = groupBy(
    tokensIn('color.').filter((doc) => !doc.token.startsWith(SYNTAX)),
    (doc) => doc.token.split('.')[1] ?? '',
  );
  return (
    <div className="docs-token-groups contour-docs-not-prose">
      {[...groups].map(([group, roles]) => {
        const title = GROUP_TITLES[group] ?? capitalize(group);
        return (
          <div key={group} className="docs-token-group">
            <h3 className="docs-token-group__title">{title}</h3>
            <ThemePanels label={title}>
              {(theme) => (
                <ul className="docs-token-roles">
                  {roles.map((doc) => (
                    <ColorRole key={doc.name} doc={doc} theme={theme} />
                  ))}
                </ul>
              )}
            </ThemePanels>
          </div>
        );
      })}
    </div>
  );
}

/** What each `color.syntax.<role>` colors, as code. */
const SYNTAX_SAMPLES: Readonly<Record<string, string>> = {
  constant: 'MAX_GAIN 0.71 true',
  string: 'add @contour-ui/react',
  comment: '// Follow the system theme',
  keyword: 'export const return',
  parameter: 'theme event',
  function: 'useTheme() Button',
  'string-expression': "'dark' /px$/",
  punctuation: '{ } ( ) , ;',
  link: 'https://example.com',
};

function SyntaxRole({
  doc,
  theme,
}: {
  readonly doc: TokenDoc;
  readonly theme: Theme;
}): ReactElement {
  const role = doc.token.slice(SYNTAX.length);
  return (
    <li className="docs-token-role">
      <TokenName name={doc.name} />
      <code className="docs-token-code" style={{ color: `var(${doc.name})` }}>
        {SYNTAX_SAMPLES[role] ?? role}
      </code>
      <div className="docs-token-role__details">
        <ThemeValue doc={doc} theme={theme} />
        <TokenDescription doc={doc} />
        <Contrast doc={doc} theme={theme} />
      </div>
    </li>
  );
}

/** The code highlighting roles, as code on the code block background (`bg.inset`), per theme. */
export function SyntaxColors(): ReactElement {
  const roles = tokensIn(SYNTAX);
  return (
    <div className="docs-token-groups contour-docs-not-prose">
      <ThemePanels label="Syntax colors">
        {(theme) => (
          <ul className="docs-token-roles">
            {roles.map((doc) => (
              <SyntaxRole key={doc.name} doc={doc} theme={theme} />
            ))}
          </ul>
        )}
      </ThemePanels>
    </div>
  );
}
