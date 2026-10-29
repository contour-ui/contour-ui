'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useTabsContext } from './tabs-context.ts';

export type TabsIndicatorProps = PrimitiveProps<'div'>;

/**
 * Tabs indicator: a `div` that follows the trigger of the selected tab, hidden from assistive
 * technology, and `hidden` while no trigger is selected or the list is not laid out. Render it
 * inside `Tabs.List`. It carries the box of the selected trigger as `--left`, `--top`, `--width`
 * and `--height`, in pixels, relative to the padding box of the list: position the list
 * (`position: relative`) and the indicator (`position: absolute`), and move it with these values
 * and a transition of your own. When it shows, it is already in place, so the transition does not
 * run.
 *
 * @example
 * <Tabs.Indicator
 *   style={{ position: 'absolute', left: 'var(--left)', width: 'var(--width)', bottom: 0, height: 2 }}
 * />
 */
export function TabsIndicator({ ref, ...props }: TabsIndicatorProps): ReactElement {
  const api = useTabsContext();
  const { ref: indicatorRef, ...indicatorProps } = api.getIndicatorProps();
  const composedRef = useComposedRefs<HTMLDivElement>(indicatorRef, ref);
  return <Primitive.div {...mergeProps(indicatorProps, props)} ref={composedRef} />;
}
