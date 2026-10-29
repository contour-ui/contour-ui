import { SegmentGroup as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type SegmentGroupItemProps = Headless.ItemProps;

/**
 * Segment group item: one option, a `label` around its native radio button. Its text is muted
 * until checked; with only an `Icon` inside (no `ItemText`), it is square. Name an icon-only item
 * with `aria-label` on its `SegmentGroup.ItemHiddenInput`.
 */
export function SegmentGroupItem({ className, ...props }: SegmentGroupItemProps): ReactElement {
  return <Headless.Item className={cx('contour-segment-group__item', className)} {...props} />;
}
