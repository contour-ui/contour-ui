import { Toc as HeadlessToc } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type TocIndicatorProps = HeadlessToc.IndicatorProps;

/**
 * Table of contents indicator: an accent bar over the line of the list, along the active
 * items. It slides to them as they change, and jumps when the user prefers reduced motion.
 * Place it in `Toc.Root`, before or after the list; it is hidden while no item is active.
 */
export function TocIndicator({ className, ...props }: TocIndicatorProps): ReactElement {
  return <HeadlessToc.Indicator className={cx('contour-toc__indicator', className)} {...props} />;
}
