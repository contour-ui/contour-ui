'use client';

import type { Tabs as KitTabs } from '@contour-ui/react';
import { Children, createContext, isValidElement, use, useId } from 'react';
import type { ComponentProps, Context, ReactElement, ReactNode } from 'react';

import { cx } from '../../utils/cx.ts';
import { DocsTabsContent, DocsTabsList, DocsTabsRoot, DocsTabsTrigger } from './tabs-parts.tsx';
import type { DocsTabsOptions } from './use-docs-tabs.ts';

export interface TabsProps extends DocsTabsOptions, Omit<ComponentProps<'div'>, 'defaultValue'> {
  /**
   * The tabs, by name: a trigger each, in this order, whose value is the name as written. A
   * `Tab` inside gives its `value` as one of them, or none to take the item of its place.
   * Without `items`, write the parts yourself: `TabsList`, `TabsTrigger` and `TabsContent`.
   */
  readonly items?: readonly string[] | undefined;
  /**
   * The item selected at first, by its index in `items`.
   *
   * @defaultValue 0
   */
  readonly defaultIndex?: number | undefined;
  /** The value selected at first, in place of `defaultIndex`: an item, or a `TabsTrigger`'s. */
  readonly defaultValue?: string | undefined;
  /** A label at the start of the row of `items`, which names the list of tabs. */
  readonly label?: ReactNode;
}

/** The `items` of the nearest `Tabs`, for a `Tab` without `value`. */
const TabItemsContext: Context<readonly string[] | undefined> = createContext<
  readonly string[] | undefined
>(undefined);

/** The index of a child of `Tabs` among its elements, for a `Tab` without `value`. */
const TabIndexContext: Context<number | null> = createContext<number | null>(null);

/**
 * Tabs of MDX content, with the props of Fumadocs' `Tabs`: `items` makes a trigger for each name,
 * and each `Tab` holds the content of one; or `TabsList`, `TabsTrigger` and `TabsContent` build
 * them part by part. A frame around Kit's `line` tabs (`tabs.css`): the row of triggers at the
 * top, the selected panel below. A code block alone in a panel fills it, and its copy button
 * moves up into the row of triggers.
 *
 * Tabs with the same `groupId` select the same tab together, and remember it for the session
 * (`sessionStorage`), or across visits with `persist` (`localStorage`), under that id. The address
 * opens the tab whose `id` it names, or that holds the element it points at; `updateAnchor`
 * writes the `id` of the selected tab into it. The server renders the default tab; a remembered
 * one follows as the page hydrates.
 *
 * Fumadocs' `remarkCodeTab` makes these from code blocks with a `tab` meta inside `<Tabs>`.
 *
 * @example
 * <Tabs items={['npm', 'pnpm']} groupId="package-manager" persist>
 *   <Tab value="npm">npm install @contour-ui/react</Tab>
 *   <Tab value="pnpm">pnpm add @contour-ui/react</Tab>
 * </Tabs>
 */
export function Tabs({
  items,
  defaultIndex = 0,
  defaultValue,
  label,
  groupId,
  persist,
  updateAnchor,
  className,
  children,
  ...props
}: TabsProps): ReactElement {
  const labelId = useId();
  const labelled = label !== undefined && label !== null && label !== false;

  // Each element child knows its place, for a `Tab` that takes its item from it.
  const placed: ReactNode[] = [];
  let index = 0;
  for (const child of Children.toArray(children)) {
    if (isValidElement(child)) {
      placed.push(
        <TabIndexContext key={child.key} value={index}>
          {child}
        </TabIndexContext>,
      );
      index += 1;
    } else {
      placed.push(child);
    }
  }

  const list =
    items === undefined ? null : (
      <DocsTabsList
        className="contour-docs-tabs__list"
        aria-labelledby={labelled ? labelId : undefined}
      >
        {items.map((item) => (
          <DocsTabsTrigger key={item} value={item} className="contour-docs-tabs__trigger">
            {item}
          </DocsTabsTrigger>
        ))}
      </DocsTabsList>
    );

  return (
    <DocsTabsRoot
      {...props}
      className={cx('contour-docs-tabs', className)}
      defaultValue={defaultValue ?? items?.[defaultIndex] ?? items?.[0] ?? null}
      groupId={groupId}
      persist={persist}
      updateAnchor={updateAnchor}
    >
      {labelled && list !== null ? (
        <div className="contour-docs-tabs__header">
          <span id={labelId} className="contour-docs-tabs__label">
            {label}
          </span>
          {list}
        </div>
      ) : (
        list
      )}
      <TabItemsContext value={items}>{placed}</TabItemsContext>
    </DocsTabsRoot>
  );
}

export interface TabProps extends ComponentProps<'div'> {
  /**
   * The item of `Tabs` whose content it holds. Without it, the item of its place among the
   * children of `Tabs`: the first child takes the first item.
   */
  readonly value?: string | undefined;
}

/**
 * The content of one item of `Tabs`, with the props of Fumadocs' `Tab`: shown while its tab is
 * selected. An `id` makes it a target of the address (`#id` selects it), and of `updateAnchor`.
 */
export function Tab({ value, className, ...props }: TabProps): ReactElement {
  const items = use(TabItemsContext);
  const index = use(TabIndexContext);
  const resolved = value ?? (index === null ? undefined : items?.[index]);
  if (resolved === undefined) {
    throw new Error(
      'Tab: give it a value, or put it in <Tabs items> at the place of its item, without one.',
    );
  }
  return (
    <DocsTabsContent
      {...props}
      className={cx('contour-docs-tabs__content', className)}
      value={resolved}
    />
  );
}

export type TabsListProps = KitTabs.ListProps;

/** The row of triggers of `Tabs` without `items`. Name it with `aria-label` when it needs one. */
export function TabsList({ className, ...props }: TabsListProps): ReactElement {
  return <DocsTabsList {...props} className={cx('contour-docs-tabs__list', className)} />;
}

export type TabsTriggerProps = KitTabs.TriggerProps;

/** A trigger of `Tabs` without `items`: selects the tab of its `value`. */
export function TabsTrigger({ className, ...props }: TabsTriggerProps): ReactElement {
  return <DocsTabsTrigger {...props} className={cx('contour-docs-tabs__trigger', className)} />;
}

export type TabsContentProps = KitTabs.ContentProps;

/** The content of the tab of its `value`, in `Tabs` without `items`. */
export function TabsContent({ className, ...props }: TabsContentProps): ReactElement {
  return <DocsTabsContent {...props} className={cx('contour-docs-tabs__content', className)} />;
}
