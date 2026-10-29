'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useTabsContext } from './tabs-context.ts';

export interface TabsContentProps extends PrimitiveProps<'div'> {
  /** The value of its tab: it shows while the tab is selected. */
  value: string;
}

/**
 * Tabs content: a `div` with the `tabpanel` role, named by its trigger, `hidden` while its tab is
 * not selected, and in the tab order. With `lazyMount` on the root, its children mount when the
 * tab is first selected; with `unmountOnExit`, they unmount when it is deselected. The element
 * itself always renders, so its trigger can point to it.
 */
export function TabsContent({ value, children, ref, ...props }: TabsContentProps): ReactElement {
  const api = useTabsContext();
  const { ref: contentRef, ...contentProps } = api.getContentProps({ value });
  const composedRef = useComposedRefs<HTMLDivElement>(contentRef, ref);
  const selected = !contentProps.hidden;
  const [visited, setVisited] = useState(selected);
  if (selected && !visited) {
    // Set while rendering: the children mount in this render, not one later.
    setVisited(true);
  }
  const mounted = selected || (!api.unmountOnExit && (!api.lazyMount || visited));
  return (
    <Primitive.div {...mergeProps(contentProps, props)} ref={composedRef}>
      {mounted ? children : null}
    </Primitive.div>
  );
}
