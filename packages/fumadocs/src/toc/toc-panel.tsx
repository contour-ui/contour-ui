'use client';

import { chevronDownIcon, chevronRightIcon, textAlignStartIcon } from '@contour-ui/icons';
import { Button, Icon, Popover, Portal, Toc } from '@contour-ui/react';
import type { TableOfContents } from 'fumadocs-core/toc';
import { useEffect, useLayoutEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

export interface TocPanelProps {
  /** The table of contents of the page, as Fumadocs gives it. */
  readonly toc: TableOfContents;
}

/**
 * The deepest heading listed: an `h3`. A deeper heading belongs to the section of the `h3`
 * above it, whose link stays current while it is read.
 */
const MAX_DEPTH = 3;

/** A heading as the tables of contents list it: the item Toc observes, and its title. */
interface Heading {
  /** The id of the heading. */
  readonly value: string;
  readonly depth: number;
  readonly title: ReactNode;
}

/** The headings a table of contents lists: the `h2`s and `h3`s, by the id their `url` links to. */
function headingsOf(toc: TableOfContents): Heading[] {
  return toc
    .filter(({ depth }) => depth <= MAX_DEPTH)
    .map(({ url, depth, title }) => ({ value: url.slice(1), depth, title }));
}

/**
 * The area of the viewport a table of contents observes, as Toc's `rootMargin`: Kit's default,
 * from 20px below the top down to 60% of the height, with its top moved below the layout's sticky
 * header and bar, so that a heading under them is not taken for one in view. Their height,
 * `--contour-docs-toc-sticky-height` (toc-panel.css), is read in px from `element`, inside the layout,
 * and read again on every resize: the layout changes it at its breakpoints.
 */
function useRootMargin(element: HTMLElement | null): string {
  const [sticky, setSticky] = useState(0);
  useLayoutEffect(() => {
    if (element === null) {
      return undefined;
    }
    const read = (): void => {
      // A registered length computes to `56px`.
      const height = getComputedStyle(element).getPropertyValue('--contour-docs-toc-sticky-height');
      setSticky(height.endsWith('px') ? Number(height.slice(0, -2)) : 0);
    };
    read();
    window.addEventListener('resize', read);
    return () => {
      window.removeEventListener('resize', read);
    };
  }, [element]);
  return `-${sticky + 20}px 0px -40% 0px`;
}

interface TocLinksProps {
  readonly headings: readonly Heading[];
  /** Called when a link is clicked. */
  readonly onLinkClick?: (() => void) | undefined;
}

/** The list of a table of contents: a link to each heading, indented by its level. */
function TocLinks({ headings, onLinkClick }: TocLinksProps): ReactElement {
  return (
    <Toc.List>
      {headings.map((heading) => (
        <Toc.Item key={heading.value} item={heading}>
          <Toc.Link onClick={onLinkClick}>{heading.title}</Toc.Link>
        </Toc.Item>
      ))}
    </Toc.List>
  );
}

interface TocHeadingsProps {
  readonly headings: readonly Heading[];
}

/**
 * The "On this page" column next to the content, on wide screens: Kit's Toc of the `h2` and `h3`
 * headings of the page. The page's sticky cell scrolls it when the list is taller than the
 * viewport, and Toc keeps the current link in view there. Nothing on a page without headings.
 */
export function TocPanel({ toc }: TocPanelProps): ReactElement | null {
  const headings = headingsOf(toc);
  return headings.length === 0 ? null : <TocColumn headings={headings} />;
}

function TocColumn({ headings }: TocHeadingsProps): ReactElement {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const rootMargin = useRootMargin(root);
  return (
    <Toc.Root
      ref={setRoot}
      items={headings}
      rootMargin={rootMargin}
      className="contour-docs-toc-panel"
    >
      <Toc.Title>
        <Icon icon={textAlignStartIcon} />
        On this page
      </Toc.Title>
      <Toc.Indicator />
      <TocLinks headings={headings} />
    </Toc.Root>
  );
}

/**
 * The "On this page" bar above the content, on narrow screens: a button as wide as the page's
 * bar that shows the current heading, and a popover with the list of the column. Following a link
 * scrolls to its heading and closes the popover. Nothing on a page without headings.
 */
export function TocPopover({ toc }: TocPanelProps): ReactElement | null {
  const headings = headingsOf(toc);
  // The state lives in a component of its own, which a page without headings unmounts: the next
  // page does not start with the heading that was current before.
  return headings.length === 0 ? null : <TocBar headings={headings} />;
}

/**
 * Where the popover goes: in the viewport, like the sticky bar it hangs from, so that it does not
 * trail behind the bar as the page scrolls.
 */
const POPOVER_POSITIONING = { strategy: 'fixed' } as const;

/**
 * The link of the current heading in the popover, for the popover to focus as it opens, so that
 * focus starts where the reader is; `null` while no heading is current, and the first link takes
 * focus.
 */
function currentLink(content: HTMLElement | null): HTMLElement | null {
  return content?.querySelector<HTMLElement>('[data-part="link"][aria-current="true"]') ?? null;
}

function TocBar({ headings }: TocHeadingsProps): ReactElement {
  const [open, setOpen] = useState(false);
  // The first active heading, as the Toc in the popover reports it, also while it is closed.
  const [current, setCurrent] = useState<string | undefined>(undefined);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  // The popover is portalled out of the layout: the trigger, inside it, reads the heights.
  const rootMargin = useRootMargin(trigger);
  const title = headings.find(({ value }) => value === current)?.title;

  // The page hides the bar on wide screens: an open popover would stay behind without it.
  useEffect(() => {
    if (!open || trigger === null) {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      if (trigger.getClientRects().length === 0) {
        setOpen(false);
      }
    });
    observer.observe(trigger);
    return () => {
      observer.disconnect();
    };
  }, [open, trigger]);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(details) => {
        setOpen(details.open);
      }}
      initialFocusEl={() => currentLink(content)}
      positioning={POPOVER_POSITIONING}
    >
      <Popover.Trigger asChild>
        <Button ref={setTrigger} variant="ghost" size="lg" className="contour-docs-toc-trigger">
          {/* The popover lines up with the text, which lines up with the article. */}
          <Popover.Anchor asChild>
            <span className="contour-docs-toc-trigger__text">
              <Icon icon={textAlignStartIcon} />
              On this page
              {/* A space, for the name "On this page Variants" in every browser. */}
              {title === undefined ? null : (
                <>
                  {' '}
                  <Icon icon={chevronRightIcon} />
                  <span className="contour-docs-toc-trigger__current">{title}</span>
                </>
              )}
              <Icon icon={chevronDownIcon} className="contour-docs-toc-trigger__chevron" />
            </span>
          </Popover.Anchor>
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            ref={setContent}
            className="contour-docs-toc-popover"
            aria-label="On this page"
          >
            <Toc.Root
              items={headings}
              rootMargin={rootMargin}
              onActiveChange={({ activeItems }) => {
                setCurrent(activeItems[0]?.value);
              }}
              aria-label="On this page"
            >
              <Toc.Indicator />
              <TocLinks
                headings={headings}
                onLinkClick={() => {
                  setOpen(false);
                }}
              />
            </Toc.Root>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
