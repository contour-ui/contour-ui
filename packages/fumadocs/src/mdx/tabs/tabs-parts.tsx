'use client';

import { useComposedRefs } from '@contour-ui/headless-react';
import { Tabs as StyledTabs } from '@contour-ui/react';
import type { ComponentProps, ReactElement } from 'react';

import { DocsTabsContext, useDocsTabs, useDocsTabsContext } from './use-docs-tabs.ts';
import type { DocsTabsOptions } from './use-docs-tabs.ts';

export interface DocsTabsRootProps
  extends DocsTabsOptions, Omit<ComponentProps<'div'>, 'defaultValue'> {
  /** The tab selected at first, and on the server; `null` for none. */
  readonly defaultValue: string | null;
}

/**
 * The root of the tabs of the MDX content: the styled `line` Tabs, with the selection of
 * `useDocsTabs` (groups, storage, the address) shared with the parts below.
 */
export function DocsTabsRoot({
  defaultValue,
  groupId,
  persist,
  updateAnchor,
  ref,
  children,
  ...props
}: DocsTabsRootProps): ReactElement {
  const tabs = useDocsTabs(defaultValue, { groupId, persist, updateAnchor });
  const composedRef = useComposedRefs<HTMLDivElement>(tabs.rootRef, ref);

  return (
    <DocsTabsContext value={tabs}>
      <StyledTabs.Root
        {...props}
        ref={composedRef}
        variant="line"
        size="md"
        value={tabs.value}
        onValueChange={(details) => {
          tabs.select(details.value);
        }}
      >
        {children}
      </StyledTabs.Root>
    </DocsTabsContext>
  );
}

/** The row of triggers, with the styled indicator, which slides to the selected one. */
export function DocsTabsList({ children, ...props }: StyledTabs.ListProps): ReactElement {
  return (
    <StyledTabs.List {...props}>
      {children}
      <StyledTabs.Indicator />
    </StyledTabs.List>
  );
}

/** A trigger, which tells the tabs it has one for its value. */
export function DocsTabsTrigger({ value, ref, ...props }: StyledTabs.TriggerProps): ReactElement {
  const tabs = useDocsTabsContext();
  const composedRef = useComposedRefs<HTMLButtonElement>(tabs.triggerRef(value), ref);
  return <StyledTabs.Trigger {...props} ref={composedRef} value={value} />;
}

/** A panel, which tells the tabs its element and the `id` given to it. */
export function DocsTabsContent({
  value,
  id,
  ref,
  ...props
}: StyledTabs.ContentProps): ReactElement {
  const tabs = useDocsTabsContext();
  const composedRef = useComposedRefs<HTMLDivElement>(tabs.contentRef(value, id), ref);
  return <StyledTabs.Content {...props} id={id} ref={composedRef} value={value} />;
}
