import { SegmentGroup as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type SegmentGroupItemControlProps = Headless.ItemControlProps;

/**
 * Segment group item control: a slot hidden from assistive technology for a mark of your own
 * next to the text. The styled SegmentGroup gives it no look of its own.
 */
export function SegmentGroupItemControl({
  className,
  ...props
}: SegmentGroupItemControlProps): ReactElement {
  return (
    <Headless.ItemControl
      className={cx('contour-segment-group__item-control', className)}
      {...props}
    />
  );
}
