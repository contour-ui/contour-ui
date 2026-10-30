import { moonIcon, sunIcon } from '@contour-ui/icons';
import type { IconData } from '@contour-ui/icons';
import { Clipboard, Icon, Table } from '@contour-ui/react';
import { defaultTheme, themes } from '@contour-ui/tokens';
import type { Theme } from '@contour-ui/tokens';
import type { ReactElement, ReactNode } from 'react';

import { capitalize, sameInEveryTheme } from './token-data.ts';
import type { TokenDoc } from './token-data.ts';

/**
 * The custom property in a clipboard: the button copies it. Its text stays "Copy" while copied
 * and the icon turns into a check mark, so the visible text stays part of its name (WCAG 2.5.3).
 */
export function TokenName({ name }: { readonly name: string }): ReactElement {
  return (
    <Clipboard.Root value={name} size="sm" className="docs-token-name">
      <Clipboard.Control>
        <Clipboard.ValueText />
        <Clipboard.Trigger aria-label={`Copy ${name}`}>
          <Clipboard.Indicator />
          Copy
        </Clipboard.Trigger>
      </Clipboard.Control>
    </Clipboard.Root>
  );
}

/** The token's description, if it has one. */
export function TokenDescription({ doc }: { readonly doc: TokenDoc }): ReactElement | null {
  return doc.description === null ? null : (
    <p className="docs-token-description">{doc.description}</p>
  );
}

/** The resolved value in `theme`, and under it the custom property it refers to. */
export function ThemeValue({
  doc,
  theme,
}: {
  readonly doc: TokenDoc;
  readonly theme: Theme;
}): ReactElement {
  const { value, alias } = doc.themes[theme];
  return (
    <span className="docs-token-value">
      <code>{value}</code>
      {alias === null ? null : <code className="docs-token-value__alias">{alias}</code>}
    </span>
  );
}

/** The value of a token the themes share; each theme's, named, should they ever differ. */
export function TokenValue({ doc }: { readonly doc: TokenDoc }): ReactElement {
  if (sameInEveryTheme(doc)) {
    return <ThemeValue doc={doc} theme={defaultTheme} />;
  }
  return (
    <span className="docs-token-value">
      {themes.map((theme) => (
        <span key={theme} className="docs-token-value__theme">
          <span className="docs-token-value__alias">{capitalize(theme)}</span>
          <ThemeValue doc={doc} theme={theme} />
        </span>
      ))}
    </span>
  );
}

const THEME_ICONS: Readonly<Record<Theme, IconData>> = { dark: moonIcon, light: sunIcon };

/**
 * A panel per theme, side by side where they fit. Each panel is a theme of its own (`data-theme`),
 * so the tokens inside it take that theme's values whatever the theme of the page.
 */
export function ThemePanels({
  label,
  children,
}: {
  /** What the panels show, for the names of the panels: "Background, dark theme". */
  readonly label: string;
  readonly children: (theme: Theme) => ReactNode;
}): ReactElement {
  return (
    <div className="docs-token-themes">
      {themes.map((theme) => (
        <div
          key={theme}
          // A group of tokens, not of form controls: a `fieldset` would draw its title on its
          // border.
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
          role="group"
          aria-label={`${label}, ${theme} theme`}
          data-theme={theme}
          className="docs-token-theme"
        >
          <p className="docs-token-theme__title">
            <Icon icon={THEME_ICONS[theme]} />
            {capitalize(theme)} theme
          </p>
          {children(theme)}
        </div>
      ))}
    </div>
  );
}

/** A column of a {@link TokenTable} after the token's own. */
export interface TokenColumn {
  readonly title: string;
  readonly render: (doc: TokenDoc) => ReactNode;
}

/** The value of each token, and the custom property it refers to. */
export const VALUE_COLUMN: TokenColumn = {
  title: 'Value',
  render: (doc) => <TokenValue doc={doc} />,
};

/**
 * Tokens in a table that scrolls sideways when it is wider than the page: the custom property with
 * its copy button and description first, then `columns`.
 */
export function TokenTable({
  rows,
  columns,
}: {
  readonly rows: readonly TokenDoc[];
  readonly columns: readonly TokenColumn[];
}): ReactElement {
  return (
    <Table.ScrollArea className="docs-token-table contour-docs-not-prose">
      <Table.Root variant="outline">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Token</Table.ColumnHeader>
            {columns.map(({ title }) => (
              <Table.ColumnHeader key={title}>{title}</Table.ColumnHeader>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((doc) => (
            <Table.Row key={doc.name}>
              <Table.ColumnHeader scope="row">
                <TokenName name={doc.name} />
                <TokenDescription doc={doc} />
              </Table.ColumnHeader>
              {columns.map(({ title, render }) => (
                <Table.Cell key={title}>{render(doc)}</Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  );
}
