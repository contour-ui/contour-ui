'use client';

import type { ReactElement } from 'react';

import { mergeProps, Primitive } from '../primitive/index.ts';
import type { PrimitiveProps } from '../primitive/index.ts';
import { TabsContext } from './tabs-context.ts';
import { useTabs } from './use-tabs.ts';
import type { UseTabsProps } from './use-tabs.ts';

export interface TabsRootProps
  extends UseTabsProps, Omit<PrimitiveProps<'div'>, keyof UseTabsProps> {}

/**
 * Tabs root: a `div` that runs the tabs machine and gives its parts the state. It holds the list
 * of triggers and the contents. Without `value` or `defaultValue`, no tab is selected until the
 * user picks one; a value without a trigger selects no trigger, and shows the content of that
 * value, if any.
 *
 * @example
 * <Tabs.Root defaultValue="mix">
 *   <Tabs.List aria-label="Channel">
 *     <Tabs.Trigger value="mix">Mix</Tabs.Trigger>
 *     <Tabs.Trigger value="sends">Sends</Tabs.Trigger>
 *     <Tabs.Indicator />
 *   </Tabs.List>
 *   <Tabs.Content value="mix">Faders</Tabs.Content>
 *   <Tabs.Content value="sends">Send levels</Tabs.Content>
 * </Tabs.Root>
 */
export function TabsRoot({
  value,
  defaultValue,
  onValueChange,
  onFocusChange,
  orientation,
  activationMode,
  loopFocus,
  lazyMount,
  unmountOnExit,
  ...props
}: TabsRootProps): ReactElement {
  const api = useTabs({
    value,
    defaultValue,
    onValueChange,
    onFocusChange,
    orientation,
    activationMode,
    loopFocus,
    lazyMount,
    unmountOnExit,
  });
  return (
    <TabsContext value={api}>
      <Primitive.div {...mergeProps(api.getRootProps(), props)} />
    </TabsContext>
  );
}
