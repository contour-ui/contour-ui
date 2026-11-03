import { SegmentGroup as Headless } from '@contour-ui/headless';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type SegmentGroupItemTextProps = Headless.ItemTextProps;

/**
 * Segment group item text: the label of an item, which names its radio button.
 */
export function SegmentGroupItemText({
  className,
  ...props
}: SegmentGroupItemTextProps): ReactElement {
  return (
    <Headless.ItemText className={cx('contour-segment-group__item-text', className)} {...props} />
  );
}
