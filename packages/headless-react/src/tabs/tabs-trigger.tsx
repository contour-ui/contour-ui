'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive, useComposedRefs } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { useTabsContext } from './tabs-context.ts';

export interface TabsTriggerProps extends PrimitiveProps<'button'> {
  /** The value of the tab it selects: any string, matched with the `value` of a content. */
  value: string;
  /**
   * The trigger ignores the user, and the arrow keys skip it.
   *
   * @defaultValue false
   */
  disabled?: boolean | undefined;
}

/**
 * Tabs trigger: a `button` with the `tab` role that selects the tab of its `value`, with a
 * click, Enter or Space; in the `automatic` mode, also when the arrow keys, Home or End move
 * focus to it. Only one trigger is in
 * the tab order, the selected one; the arrow keys, Home and End move between them. It carries
 * `data-selected`, `data-focus` and `data-disabled`.
 */
export function TabsTrigger({ value, disabled, ref, ...props }: TabsTriggerProps): ReactElement {
  const api = useTabsContext();
  const { ref: triggerRef, ...triggerProps } = api.getTriggerProps({ value, disabled });
  const composedRef = useComposedRefs<HTMLButtonElement>(triggerRef, ref);
  return <Primitive.button {...mergeProps(triggerProps, props)} ref={composedRef} />;
}
