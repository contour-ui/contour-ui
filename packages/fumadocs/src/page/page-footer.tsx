import { chevronLeftIcon, chevronRightIcon } from '@contour-ui/icons';
import { Card, Icon } from '@contour-ui/react';
import { Link as FrameworkLink } from 'fumadocs-core/framework';
import { findNeighbour } from 'fumadocs-core/page-tree';
import type { Item, Root } from 'fumadocs-core/page-tree';
import type { ReactElement } from 'react';

export interface PageFooterProps {
  /** The page tree of the site, as the layout has it. */
  readonly tree: Root;
  /** The URL of the page, as in the tree (`/docs/essentials/button`). */
  readonly url: string;
}

/**
 * The links to the previous and the next page of the section (`page-footer.css`), in the order
 * of the sidebar. The first page of a section has no previous one and the last no next one;
 * a page with neither renders nothing. It sets no margin: the page spaces it from the content.
 */
export function PageFooter({ tree, url }: PageFooterProps): ReactElement | null {
  // Each section is a root folder of the tree: `separateRoot` keeps the neighbours inside the
  // section of the page. It is the default, spelled out since the footer relies on it.
  const { previous, next } = findNeighbour(tree, url, { separateRoot: true });
  if (previous === undefined && next === undefined) {
    return null;
  }
  return (
    <nav className="contour-docs-page-footer" aria-label="Previous and next page">
      {previous === undefined ? null : <NeighbourLink direction="previous" page={previous} />}
      {next === undefined ? null : <NeighbourLink direction="next" page={next} />}
    </nav>
  );
}

interface NeighbourLinkProps {
  readonly direction: 'previous' | 'next';
  readonly page: Item;
}

/**
 * A neighbour as the styled `Card`, the whole card one link of the framework: "Previous" or "Next"
 * with a chevron that points that way, over the title of the page.
 */
function NeighbourLink({ direction, page }: NeighbourLinkProps): ReactElement {
  const previous = direction === 'previous';
  return (
    <Card.Root
      asChild
      size="lg"
      className="contour-docs-page-footer__link"
      data-direction={direction}
    >
      <FrameworkLink href={page.url} rel={previous ? 'prev' : 'next'}>
        <Card.Body>
          <span className="contour-docs-page-footer__label">
            {previous ? (
              <>
                <Icon icon={chevronLeftIcon} />
                Previous
              </>
            ) : (
              <>
                Next
                <Icon icon={chevronRightIcon} />
              </>
            )}
          </span>
          <Card.Title asChild>
            <span>{page.name}</span>
          </Card.Title>
        </Card.Body>
      </FrameworkLink>
    </Card.Root>
  );
}
