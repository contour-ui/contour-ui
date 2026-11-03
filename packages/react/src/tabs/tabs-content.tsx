'use client';

import { Tabs as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';
import { useTabsStyle } from './tabs-style-context.ts';

export type TabsContentProps = Headless.ContentProps;

/** Tabs content: the panel of one tab, shown while it is selected, in the body text style. */
export function TabsContent({ className, ...props }: TabsContentProps): ReactElement {
  return (
    <Headless.Content
      className={cx('contour-tabs__content', className)}
      {...useTabsStyle()}
      {...props}
    />
  );
}
