import type {
  SearchResultItem,
  SearchResultRecord,
  SearchResultTable,
} from 'fumadocs-core/search/client';

/** The parsed content of a result: a hast root. */
export type ResultContent = SearchResultRecord['hastContent'];
/** A node of the content. */
type ContentNode = ResultContent['children'][number];
/** An element of the content, such as a table cell. */
export type ContentElement = Extract<ContentNode, { readonly type: 'element' }>;

/** A page of the results and what matches in it, as the search ranked them. */
export interface ResultGroup {
  /** The result of the page itself: its title and breadcrumbs. */
  readonly page: SearchResultRecord;
  /** The headings, paragraphs and tables of the page that match, in order. */
  readonly matches: ReadonlyArray<SearchResultRecord | SearchResultTable>;
}

/**
 * The results page by page. The search lists each page before its matches; anything before the
 * first page has no page to go under and is left out.
 */
export function groupResults(items: readonly SearchResultItem[]): ResultGroup[] {
  const groups: Array<{ page: SearchResultRecord; matches: SearchResultItem[] }> = [];
  for (const item of items) {
    if (item.type === 'page') {
      groups.push({ page: item, matches: [] });
    } else {
      groups.at(-1)?.matches.push(item);
    }
  }
  return groups;
}

/** Text to compare: lower case, without code marks, runs of white space as one space. */
const comparable = (text: string): string =>
  text.replaceAll('`', '').replaceAll(/\s+/gu, ' ').trim().toLowerCase();

/**
 * The groups with the pages titled as the query first, the others in the order of the search.
 * The search ranks a page by its best match, so the index page of a section, which lists its
 * components, can come before the page of the component itself: "button" finds Kit's overview
 * first. Only whole groups move; the matches of a page keep the order of the search.
 */
export function rankGroups(groups: readonly ResultGroup[], query: string): ResultGroup[] {
  const wanted = comparable(query);
  const titled = (group: ResultGroup): boolean => comparable(group.page.content) === wanted;
  return [...groups.filter((group) => titled(group)), ...groups.filter((group) => !titled(group))];
}

/** The results the user picks from, in the order they show: each page, then its matches. */
export function resultOptions(groups: readonly ResultGroup[]): SearchResultRecord[] {
  return groups.flatMap((group) => [
    group.page,
    ...group.matches.flatMap((match) => (match.type === 'table' ? match.rows : [match])),
  ]);
}

/**
 * The breadcrumbs of a page, without the first one: the root of the page tree, which every page
 * shares.
 */
export function pageBreadcrumbs(page: SearchResultRecord): readonly string[] {
  return page.breadcrumbs?.slice(1) ?? [];
}

/** The nodes inside a node of the content. */
function childrenOf(node: ResultContent | ContentNode): readonly ContentNode[] {
  return node.type === 'root' || node.type === 'element' ? node.children : [];
}

/** The elements named `tagName` inside a node, outermost first, in document order. */
function elementsNamed(node: ResultContent | ContentNode, tagName: string): ContentElement[] {
  return childrenOf(node).flatMap((child) => {
    if (child.type !== 'element') {
      return [];
    }
    return child.tagName === tagName ? [child] : elementsNamed(child, tagName);
  });
}

/** The text of a node of the content, without its markup. */
export function textOf(node: ResultContent | ContentNode): string {
  return node.type === 'text'
    ? node.value
    : childrenOf(node)
        .map((child) => textOf(child))
        .join('');
}

/** The content inside an element, as a root of its own: the content of a table cell. */
export function contentOf(element: ContentElement): ResultContent {
  return { type: 'root', children: element.children };
}

/**
 * The cells of a table row: its body cells, or the header cells of a table that has nothing but
 * a header row.
 */
export function rowCells(row: SearchResultRecord): ContentElement[] {
  const cells = elementsNamed(row.hastContent, 'td');
  return cells.length > 0 ? cells : elementsNamed(row.hastContent, 'th');
}

/** The header cells of a table: none for a table without a header. */
export function headerCells(table: SearchResultTable): ContentElement[] {
  return table.header === undefined ? [] : elementsNamed(table.header, 'th');
}
