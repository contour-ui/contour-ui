'use client';

import { Collapsible } from '@contour-ui/react';
import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

export interface CollapsibleFolderProps {
  /** The name of the folder. */
  readonly name: ReactNode;
  /** The id of the element that shows the name: it names the list of the folder's pages. */
  readonly labelId: string;
  /**
   * The link to the index page of the folder, which shows its name, with `labelId` as its id; a
   * folder without one shows its name in the toggle.
   */
  readonly link?: ReactNode;
  /** Whether the folder starts open (`defaultOpen` in its `meta.json`). */
  readonly defaultOpen: boolean;
  /**
   * Whether the page on screen is in the folder. The folder starts open then, and opens when the
   * reader goes to a page of it.
   */
  readonly active: boolean;
  /** The pages and groups of the folder. */
  readonly children: ReactNode;
}

/**
 * A folder of the page tree that opens and closes (`page-tree.css`), on Kit's Collapsible. Its
 * row holds the link to its index page and, after it, the toggle, a button named after the
 * folder; without an index page, the whole row is the toggle. Its pages slide open under it.
 *
 * It starts open with `defaultOpen` or when it holds the page on screen, and opens as the reader
 * goes to one of its pages from elsewhere; it stays as the reader leaves it otherwise.
 */
export function CollapsibleFolder({
  name,
  labelId,
  link,
  defaultOpen,
  active,
  children,
}: CollapsibleFolderProps): ReactElement {
  const [open, setOpen] = useState(defaultOpen || active);
  // Set while rendering, as the pathname changes: the folder of the new page shows open at once.
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) {
      setOpen(true);
    }
  }

  return (
    <Collapsible.Root
      asChild
      open={open}
      onOpenChange={(details) => {
        setOpen(details.open);
      }}
    >
      <li className="contour-docs-page-tree__group contour-docs-page-tree__collapsible">
        <div className="contour-docs-page-tree__folder-row">
          {link === undefined ? (
            <Collapsible.Trigger className="contour-docs-page-tree__folder-trigger">
              <span id={labelId} className="contour-docs-page-tree__folder-name">
                {name}
              </span>
              <Collapsible.Indicator />
            </Collapsible.Trigger>
          ) : (
            <>
              {link}
              <Collapsible.Trigger className="contour-docs-page-tree__folder-toggle">
                <Collapsible.Indicator />
                <span className="contour-docs-page-tree__toggle-label">{name} pages</span>
              </Collapsible.Trigger>
            </>
          )}
        </div>
        <Collapsible.Content className="contour-docs-page-tree__folder-content">
          <div className="contour-docs-page-tree__folder">{children}</div>
        </Collapsible.Content>
      </li>
    </Collapsible.Root>
  );
}
