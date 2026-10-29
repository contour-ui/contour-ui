import { SegmentGroup as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type SegmentGroupLabelProps = Headless.LabelProps;

/**
 * Segment group label: a muted caption at the start of the track that names the group.
 */
export function SegmentGroupLabel({ className, ...props }: SegmentGroupLabelProps): ReactElement {
  return <Headless.Label className={cx('contour-segment-group__label', className)} {...props} />;
}
