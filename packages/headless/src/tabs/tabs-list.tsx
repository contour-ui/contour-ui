'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useTabsContext } from './tabs-context.ts';

export type TabsListProps = PrimitiveProps<'div'>;

/**
 * Tabs list: a `div` with the `tablist` role that holds the triggers, and the indicator. Name it
 * with `aria-label` or `aria-labelledby` when the page does not make its purpose plain. It is the
 * containing block of the indicator: give it `position: relative` to place one.
 */
export function TabsList(props: TabsListProps): ReactElement {
  const api = useTabsContext();
  return <Primitive.div {...mergeProps(api.getListProps(), props)} />;
}
