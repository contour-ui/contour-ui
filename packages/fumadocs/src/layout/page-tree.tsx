import { arrowUpRightIcon } from '@contour-ui/icons';
import { Icon } from '@contour-ui/kit';
import { Link as FrameworkLink } from 'fumadocs-core/framework';
import type { Folder, Node, Root } from 'fumadocs-core/page-tree';
import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { isExternalHref } from '../utils/href.ts';
import { CollapsibleFolder } from './page-tree-folder.tsx';
import { containsPage, getSectionUrl } from './sections.ts';

export interface PageTreeProps {
  /** The section whose pages to list, or the whole tree for a page outside the sections. */
  readonly root: Root | Folder;
  /** The URL of the page, as in the tree: its link is the current one. */
  readonly url: string;
}

/**
 * The pages of a section as the navigation "Docs" (`page-tree.css`): the pages before the first
 * separator (`---Name---` in `meta.json`), then a list per separator, labeled with its name. A
 * folder lists its own pages under its name, and opens and closes unless its `meta.json` says
 * `"collapsible": false`; a section, listed on a page outside the sections, is a link to where it
 * starts. The link of the page is `aria-current="page"`.
 */
export function PageTree({ root, url }: PageTreeProps): ReactElement {
  return (
    <nav aria-label="Docs" className="contour-docs-page-tree">
      <PageTreeNodes nodes={root.children} url={url} />
    </nav>
  );
}

/** Nodes up to the next separator, under the name of the separator before them. */
interface NodeGroup {
  readonly key: string;
  readonly label: ReactNode;
  readonly nodes: readonly Node[];
}

/** Split nodes at their separators: the nodes before the first one, then one group per separator. */
function groupNodes(nodes: readonly Node[]): NodeGroup[] {
  const groups: NodeGroup[] = [];
  let group: { key: string; label: ReactNode; nodes: Node[] } = {
    key: 'start',
    label: undefined,
    nodes: [],
  };
  for (const node of nodes) {
    if (node.type === 'separator') {
      groups.push(group);
      group = { key: node.$id ?? `separator-${groups.length}`, label: node.name, nodes: [] };
    } else {
      group.nodes.push(node);
    }
  }
  groups.push(group);
  return groups.filter((entry) => entry.nodes.length > 0);
}

interface PageTreeNodesProps {
  readonly nodes: readonly Node[];
  readonly url: string;
  /** The id of the element that names the nodes before the first separator: their folder's name. */
  readonly labelledBy?: string | undefined;
}

function PageTreeNodes({ nodes, url, labelledBy }: PageTreeNodesProps): ReactElement {
  return (
    <>
      {groupNodes(nodes).map((group) => (
        <PageTreeList
          key={group.key}
          label={group.label}
          labelledBy={labelledBy}
          nodes={group.nodes}
          url={url}
        />
      ))}
    </>
  );
}

interface PageTreeListProps extends PageTreeNodesProps {
  /** The name of the list, or nothing for the pages before the first separator. */
  readonly label: ReactNode;
}

/** A list of nodes, under its name when it has one, or else named by `labelledBy`. */
function PageTreeList({ label, labelledBy, nodes, url }: PageTreeListProps): ReactElement {
  const labelId = useId();
  const labelled = label !== undefined && label !== null;
  const list = (
    <ul className="contour-docs-page-tree__list" aria-labelledby={labelled ? labelId : labelledBy}>
      {nodes.map((node, index) => (
        <PageTreeItem key={node.$id ?? index} node={node} url={url} />
      ))}
    </ul>
  );

  if (!labelled) {
    return list;
  }
  return (
    <div className="contour-docs-page-tree__group">
      <div id={labelId} className="contour-docs-page-tree__label">
        {label}
      </div>
      {list}
    </div>
  );
}

interface PageTreeItemProps {
  readonly node: Node;
  readonly url: string;
}

function PageTreeItem({ node, url }: PageTreeItemProps): ReactElement | null {
  if (node.type === 'separator') {
    return null;
  }
  if (node.type === 'page') {
    return (
      <li>
        <PageLink href={node.url} current={node.url === url} external={node.external}>
          {node.name}
        </PageLink>
      </li>
    );
  }
  if (node.root !== undefined && node.root !== false) {
    const href = getSectionUrl(node);
    return href === undefined ? null : (
      <li>
        <PageLink href={href} current={false}>
          {node.name}
        </PageLink>
      </li>
    );
  }
  return <PageTreeFolder folder={node} url={url} />;
}

interface PageTreeFolderProps {
  readonly folder: Folder;
  readonly url: string;
}

/**
 * A folder, which opens and closes (`CollapsibleFolder`): its index page is the link of its name,
 * and its pages and groups are indented under it. One with `"collapsible": false` in its
 * `meta.json` stays open: its name, then its index page and its pages and groups. The name labels
 * the list of the pages before its first separator.
 */
function PageTreeFolder({ folder, url }: PageTreeFolderProps): ReactElement {
  const labelId = useId();

  if (folder.collapsible === false) {
    const nodes = folder.index === undefined ? folder.children : [folder.index, ...folder.children];
    return (
      <li className="contour-docs-page-tree__group">
        <div id={labelId} className="contour-docs-page-tree__label">
          {folder.name}
        </div>
        <div className="contour-docs-page-tree__folder">
          <PageTreeNodes nodes={nodes} url={url} labelledBy={labelId} />
        </div>
      </li>
    );
  }
  const { index } = folder;
  return (
    <CollapsibleFolder
      name={folder.name}
      labelId={labelId}
      link={
        index === undefined ? undefined : (
          <PageLink
            id={labelId}
            folder
            href={index.url}
            current={index.url === url}
            external={index.external}
          >
            {folder.name}
          </PageLink>
        )
      }
      defaultOpen={folder.defaultOpen === true}
      active={containsPage(folder, url)}
    >
      <PageTreeNodes nodes={folder.children} url={url} labelledBy={labelId} />
    </CollapsibleFolder>
  );
}

interface PageLinkProps {
  readonly href: string;
  readonly current: boolean;
  /** Whether the page is on another site; by default, when `href` has a scheme. */
  readonly external?: boolean | undefined;
  /** The id of the link, when something points at it. */
  readonly id?: string | undefined;
  /** Whether it is the index page of a folder, in the row of its name. */
  readonly folder?: boolean | undefined;
  readonly children: ReactNode;
}

/**
 * A page: through the framework, or in a new tab for another site, with an arrow that says so.
 */
function PageLink({ href, current, external, id, folder, children }: PageLinkProps): ReactElement {
  const className =
    folder === true
      ? 'contour-docs-page-tree__link contour-docs-page-tree__folder-link'
      : 'contour-docs-page-tree__link';
  if (external ?? isExternalHref(href)) {
    return (
      <a id={id} className={className} href={href} target="_blank" rel="noreferrer noopener">
        {children}
        <Icon icon={arrowUpRightIcon} label="opens in a new tab" />
      </a>
    );
  }
  return (
    <FrameworkLink
      id={id}
      className={className}
      href={href}
      aria-current={current ? 'page' : undefined}
    >
      {children}
    </FrameworkLink>
  );
}
