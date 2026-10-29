'use client';

import { Tabs as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';
import { useTabsStyle } from './tabs-style-context.ts';

export type TabsIndicatorProps = Headless.IndicatorProps;

/**
 * Tabs indicator: the mark of the selected trigger (the bar of `line`, the box of `enclosed` and
 * `subtle`), which slides to the next selected trigger. Render it inside `Tabs.List`. Until it
 * is measured, and without it, the selected trigger draws the mark itself.
 */
export function TabsIndicator({ className, ...props }: TabsIndicatorProps): ReactElement {
  return (
    <Headless.Indicator
      className={cx('contour-tabs__indicator', className)}
      {...useTabsStyle()}
      {...props}
    />
  );
}
