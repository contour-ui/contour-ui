import { SegmentGroup as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

import { cx } from '../utils/cx.ts';

export type SegmentGroupItemHiddenInputProps = Headless.ItemHiddenInputProps;

/**
 * Segment group item hidden input: the native radio button of an item, out of sight. Put it in
 * every `SegmentGroup.Item`; give it `aria-label` when the item shows only an icon.
 */
export function SegmentGroupItemHiddenInput({
  className,
  ...props
}: SegmentGroupItemHiddenInputProps): ReactElement {
  return (
    <Headless.ItemHiddenInput
      className={cx('contour-segment-group__item-hidden-input', className)}
      {...props}
    />
  );
}
