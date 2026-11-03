'use client';

import { Tabs as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';
import { useTabsStyle } from './tabs-style-context.ts';

export type TabsListProps = Headless.ListProps;

/**
 * Tabs list: the row (or column) of triggers, which scrolls when they do not fit. Name it with
 * `aria-label` when the page does not make its purpose plain. Put a `Tabs.Indicator` in it to
 * slide the mark of the selected trigger from one trigger to the next.
 */
export function TabsList({ className, ...props }: TabsListProps): ReactElement {
  return (
    <Headless.List className={cx('contour-tabs__list', className)} {...useTabsStyle()} {...props} />
  );
}
