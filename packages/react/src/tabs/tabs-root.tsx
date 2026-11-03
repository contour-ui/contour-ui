'use client';

import { Tabs as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';
import { TabsStyleContext } from './tabs-style-context.ts';

export interface TabsRootProps extends Headless.RootProps {
  /**
   * How the tabs look: `line`, triggers over a rule with a bar under the selected one; `enclosed`,
   * triggers in a sunken strip with the selected one raised, as a code block header holds them;
   * `subtle`, a filled selected trigger and no rule.
   *
   * @defaultValue 'line'
   */
  variant?: 'line' | 'enclosed' | 'subtle' | undefined;
  /**
   * Height of the triggers: `sm`, `md` or `lg`, the `--ct-size-control-*` tokens; `lg` has the
   * larger label and inset of a large control.
   *
   * @defaultValue 'md'
   */
  size?: 'sm' | 'md' | 'lg' | undefined;
}

/**
 * Tabs root: runs the tabs of `@contour-ui/headless` and gives every part its `variant` and
 * `size`, as `data-variant` and `data-size`. A vertical root (`orientation="vertical"`) puts the
 * list beside the contents.
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
  variant = 'line',
  size = 'md',
  className,
  ...props
}: TabsRootProps): ReactElement {
  return (
    <TabsStyleContext value={{ variant, size }}>
      <Headless.Root
        className={cx('contour-tabs', className)}
        data-variant={variant}
        data-size={size}
        {...props}
      />
    </TabsStyleContext>
  );
}
