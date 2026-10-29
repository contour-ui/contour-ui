'use client';

import { checkIcon, chevronsUpDownIcon } from '@contour-ui/icons';
import { Button, Icon, Popover, Portal } from '@contour-ui/react';
import { Link as FrameworkLink } from 'fumadocs-core/framework';
import type { Folder } from 'fumadocs-core/page-tree';
import { useId, useState } from 'react';
import type { ReactElement } from 'react';

import { getSectionUrl } from './sections.ts';

export interface SectionSwitcherProps {
  /** The sections to choose from. */
  readonly sections: readonly Folder[];
  /** The section of the page, or `undefined` for a page outside them. */
  readonly current: Folder | undefined;
}

/**
 * A button that shows the section of the page and opens the list of sections in a popover
 * (`section-switcher.css`): each one's name and description, as a link to where it starts, the
 * current one checked. Choosing one closes the popover and goes there; the navigation then lists
 * the pages of that section. The popover is mounted while it shows.
 */
export function SectionSwitcher({ sections, current }: SectionSwitcherProps): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root
      lazyMount
      unmountOnExit
      open={open}
      onOpenChange={(details) => {
        setOpen(details.open);
      }}
      positioning={{ placement: 'bottom-start', offset: 4, sameWidth: true }}
    >
      <Popover.Trigger asChild>
        <Button variant="outline" size="lg" className="contour-docs-section-switcher">
          <span className="contour-docs-section-switcher__value">
            {current?.name ?? 'Sections'}
          </span>
          <Icon icon={chevronsUpDownIcon} />
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content className="contour-docs-section-switcher__content" aria-label="Sections">
            <ul className="contour-docs-section-switcher__list">
              {sections.map((section) => {
                const href = getSectionUrl(section);
                return href === undefined ? null : (
                  <li key={section.$id ?? href}>
                    <SectionLink
                      section={section}
                      href={href}
                      current={section === current}
                      onSelect={() => {
                        setOpen(false);
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}

interface SectionLinkProps {
  readonly section: Folder;
  readonly href: string;
  readonly current: boolean;
  readonly onSelect: () => void;
}

/**
 * A section as a link named by the section's name. Its description describes the link instead of
 * joining the name, so a screen reader reads it after the name and the state.
 */
function SectionLink({ section, href, current, onSelect }: SectionLinkProps): ReactElement {
  const descriptionId = useId();
  const described = section.description !== undefined;

  return (
    <FrameworkLink
      href={href}
      className="contour-docs-section-switcher__link"
      aria-current={current ? 'true' : undefined}
      aria-describedby={described ? descriptionId : undefined}
      onClick={onSelect}
    >
      <span className="contour-docs-section-switcher__name">{section.name}</span>
      {described ? (
        <span
          id={descriptionId}
          className="contour-docs-section-switcher__description"
          aria-hidden="true"
        >
          {section.description}
        </span>
      ) : null}
      {current ? <Icon icon={checkIcon} className="contour-docs-section-switcher__check" /> : null}
    </FrameworkLink>
  );
}
