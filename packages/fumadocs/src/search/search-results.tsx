import {
  chevronRightIcon,
  fileTextIcon,
  hashIcon,
  tableIcon,
  textAlignStartIcon,
} from '@contour-ui/icons';
import type { IconData } from '@contour-ui/icons';
import { Icon, Listbox } from '@contour-ui/kit';
import type { SearchResultRecord, SearchResultTable } from 'fumadocs-core/search/client';
import { toJsx } from 'fumadocs-core/utils/hast-to-jsx';
import type { ToJsxOptions } from 'fumadocs-core/utils/hast-to-jsx';
import { Fragment, useMemo } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

import { contentOf, headerCells, pageBreadcrumbs, rowCells, textOf } from './search-groups.ts';
import type { ContentElement, ResultContent, ResultGroup } from './search-groups.ts';

/** The icon of each kind of result. */
const KIND_ICONS: Readonly<Record<SearchResultRecord['type'], IconData>> = {
  page: fileTextIcon,
  heading: hashIcon,
  text: textAlignStartIcon,
};

/**
 * How the Markdown of a result renders inside its option: inline code and emphasis stay, a
 * paragraph flows next to the icon, and a link is plain text, since the option is the link.
 */
const CONTENT_OPTIONS: ToJsxOptions = {
  components: { a: 'span', p: 'span' },
};

/** The content of a result, rendered once per content. */
function Content({ content }: { readonly content: ResultContent }): ReactNode {
  return useMemo(() => toJsx(content, CONTENT_OPTIONS), [content]);
}

/** The content of a table cell, without the cell element itself. */
function CellContent({ cell }: { readonly cell: ContentElement }): ReactNode {
  return useMemo(() => toJsx(contentOf(cell), CONTENT_OPTIONS), [cell]);
}

/** The page of a group: its title, and the section it is in (the breadcrumbs). */
function PageOption({ page }: { readonly page: SearchResultRecord }): ReactElement {
  const breadcrumbs = pageBreadcrumbs(page);
  return (
    <Listbox.Item className="contour-docs-search__option" data-kind="page" item={page}>
      <Icon className="contour-docs-search__icon" icon={KIND_ICONS.page} />
      <span className="contour-docs-search__text">
        <Content content={page.hastContent} />
      </span>{' '}
      {breadcrumbs.length === 0 ? null : (
        <span className="contour-docs-search__breadcrumbs" data-highlight-ignore="">
          {breadcrumbs.map((crumb, index) => (
            <Fragment key={crumb}>
              {index === 0 ? null : <Icon icon={chevronRightIcon} />} {crumb}
            </Fragment>
          ))}
        </span>
      )}
    </Listbox.Item>
  );
}

/** A heading or a paragraph of a page, under the page. */
function MatchOption({ match }: { readonly match: SearchResultRecord }): ReactElement {
  return (
    <Listbox.Item className="contour-docs-search__option" data-kind={match.type} item={match}>
      <Icon className="contour-docs-search__icon" icon={KIND_ICONS[match.type]} />
      <span className="contour-docs-search__text">
        <Content content={match.hastContent} />
      </span>
    </Listbox.Item>
  );
}

/**
 * The columns of a table: the icon, then the cells, which share the room: as wide as their
 * content asks while it allows, all of them shrinking alike when it does not.
 */
const tableColumns = (columns: number): CSSProperties => ({
  gridTemplateColumns: `max-content repeat(${Math.max(1, columns)}, minmax(0, auto))`,
});

/**
 * Rows of a table that match, under the page: the header row, with the icon of a table and the
 * names of the columns, then one option per row. Each cell starts with the name of its column,
 * which only assistive technology reads while the header row shows (the row itself is hidden
 * from it), and everyone reads once the cells stack in a narrow dialog, where each row shows the
 * icon of a table in place of the header row.
 */
function TableMatch({ table }: { readonly table: SearchResultTable }): ReactElement {
  const header = headerCells(table);
  const labels = header.map((cell) => textOf(cell));
  return (
    <div className="contour-docs-search__table" style={tableColumns(table.columns)}>
      <div className="contour-docs-search__table-header" aria-hidden="true">
        <Icon className="contour-docs-search__icon" icon={tableIcon} />
        {header.map((cell, column) => (
          // A cell has no identity but its column, and the columns never move.
          // oxlint-disable-next-line react/no-array-index-key
          <span key={column} className="contour-docs-search__cell">
            <CellContent cell={cell} />
          </span>
        ))}
      </div>
      {table.rows.map((row) => (
        <Listbox.Item
          key={row.id}
          className="contour-docs-search__option contour-docs-search__table-row"
          data-kind="row"
          item={row}
        >
          <Icon className="contour-docs-search__icon" icon={tableIcon} />
          <span className="contour-docs-search__cells">
            {rowCells(row).map((cell, column) => (
              // oxlint-disable-next-line react/no-array-index-key
              <span key={column} className="contour-docs-search__cell">
                {labels[column] === undefined ? null : (
                  <span className="contour-docs-search__cell-label" data-highlight-ignore="">
                    {`${labels[column]}: `}
                  </span>
                )}
                <CellContent cell={cell} />{' '}
              </span>
            ))}
          </span>
        </Listbox.Item>
      ))}
    </div>
  );
}

export interface SearchResultGroupProps {
  readonly group: ResultGroup;
  /** Highlights the query in the text of the group (`useHighlightQuery`). */
  readonly highlightRef: (element: Element | null) => () => void;
}

/**
 * A page of the results, as a group of options named by the page and its section: the page
 * itself, then its headings, paragraphs and table rows that match, indented under it.
 */
export function SearchResultGroup({ group, highlightRef }: SearchResultGroupProps): ReactElement {
  const name = [textOf(group.page.hastContent), ...pageBreadcrumbs(group.page)].join(', ');
  return (
    <Listbox.ItemGroup ref={highlightRef} className="contour-docs-search__group" aria-label={name}>
      <PageOption page={group.page} />
      {group.matches.map((match) =>
        match.type === 'table' ? (
          <TableMatch key={match.id} table={match} />
        ) : (
          <MatchOption key={match.id} match={match} />
        ),
      )}
    </Listbox.ItemGroup>
  );
}
