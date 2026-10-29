import { SegmentGroup as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type SegmentGroupIndicatorProps = Headless.IndicatorProps;

/**
 * Segment group indicator: the raised surface under the checked item, with a border and a
 * shadow, so the choice does not rest on color alone. It slides between items, and jumps when the
 * user prefers reduced motion. Put it first in `SegmentGroup.Root`.
 */
export function SegmentGroupIndicator({
  className,
  ...props
}: SegmentGroupIndicatorProps): ReactElement {
  return (
    <Headless.Indicator className={cx('contour-segment-group__indicator', className)} {...props} />
  );
}
