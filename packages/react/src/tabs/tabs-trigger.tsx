'use client';

import { Tabs as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';
import { useTabsStyle } from './tabs-style-context.ts';

export type TabsTriggerProps = Headless.TriggerProps;

/**
 * Tabs trigger: selects the tab of its `value`. The selected one carries the mark of the variant
 * (a bar, a raised or a filled box) besides its color, until a `Tabs.Indicator` takes the mark
 * over. Icons inside it are sized with the label.
 */
export function TabsTrigger({ className, ...props }: TabsTriggerProps): ReactElement {
  return (
    <Headless.Trigger
      className={cx('contour-tabs__trigger', className)}
      {...useTabsStyle()}
      {...props}
    />
  );
}
