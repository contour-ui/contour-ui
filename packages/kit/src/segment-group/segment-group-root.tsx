import { SegmentGroup as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export interface SegmentGroupRootProps extends Headless.RootProps {
  /**
   * Height: `sm`, `md` or `lg`, the `--ct-size-control-*` tokens. In `lg`, the labels are
   * larger too, with wider sides: the `label-lg` text style and `--ct-space-control-inset-lg`.
   *
   * @defaultValue 'md'
   */
  size?: 'sm' | 'md' | 'lg' | undefined;
}

/**
 * Segment group root: a row of mutually exclusive options on an inset track, one of them raised
 * by the indicator. Runs the segment group of `@contour-ui/headless-react`: native radio buttons give
 * the keyboard and the form value. Name it with `SegmentGroup.Label` or `aria-label`.
 *
 * @example
 * <SegmentGroup.Root defaultValue="week" aria-label="Range">
 *   <SegmentGroup.Indicator />
 *   <SegmentGroup.Item value="day">
 *     <SegmentGroup.ItemText>Day</SegmentGroup.ItemText>
 *     <SegmentGroup.ItemHiddenInput />
 *   </SegmentGroup.Item>
 * </SegmentGroup.Root>
 */
export function SegmentGroupRoot({
  size = 'md',
  className,
  ...props
}: SegmentGroupRootProps): ReactElement {
  return (
    <Headless.Root className={cx('contour-segment-group', className)} data-size={size} {...props} />
  );
}
